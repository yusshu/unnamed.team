/*
 * Module dedicated to functions for the documentation
 * pages, which fetches, parses and shows our projects
 * documentation, taken from GitHub, there are some rules
 * to make a GitHub repository applicable for a documentation
 * webpage.
 *
 * These are:
 * - The GitHub repository must contain a 'docs' folder in
 *   the project main (root) folder
 *
 * - Documentation pages are markdown files (must end with
 *   '.md')
 *
 * - The main documentation page inside a folder must be
 *   named 'readme.md)
 *
 * See /pages/docs/[...slug].tsx file for more information
 */
import * as strings from '@/lib/string';
import Version from "@/lib/project/version";
import Documentation from "@/lib/project/documentation/documentation";
import { Node, DirectoryNode, DirectoryNodeContent, FileNode } from "@/lib/project/documentation/documentation_node";
import { fetchFromGitHub, fetchRepositoryContents, GitHubContent, GitHubRepository } from "@/lib/project/github/github";
import replaceNexusVersions from "@/lib/project/github/processor/replace_nexus_versions";
import markdownToHtml from "@/lib/project/github/processor/markdown_to_html";

export const INDEX_FILE_NAME = 'index.txt';
export const PAGE_SUFFIX = '.md';
export const ROOT_FOLDER = 'docs';

const contentProcessors: (((input: string, repository: GitHubRepository, version: Version, content: GitHubContent) => Promise<string>)[]) = [
  replaceNexusVersions,
  markdownToHtml,
];

export async function fetchDocumentation(repository: GitHubRepository, version: Version): Promise<Documentation | null> {

  const documentation: Documentation = {
    content: {}
  };

  async function fetchDocsAtAndFillInto(path: string, into: DirectoryNodeContent): Promise<void> {
    // fetch contents for this path
    const contents = await fetchRepositoryContents(repository.fullName, path, version.version);

    if (contents === null) {
      return;
    }

    const entries: Array<[ string, Node<any> ]> = [];
    let index: string[] | null = null;

    // find all contents recursively
    for (const content of contents) {
      const type = content.type;
      if (type === 'file') {
        if (content.name === INDEX_FILE_NAME) {
          // found the index file, parse it
          const txt = await (await fetch(content.downloadUrl)).text();
          index = txt.split(/\r?\n/g).map(name => name.trim());
          continue;
        }

        if (content.name.endsWith(PAGE_SUFFIX)) {
          // found a file that ends with .md, must be a documentation page
          const key = content.name.slice(0, -PAGE_SUFFIX.length);

          // the path, without the root folder (/docs), starting with a slash
          const currPath = path.substring(Math.min(ROOT_FOLDER.length, path.length));

          const directoryPath = currPath.split('/');
          strings.trimStringArray(directoryPath);

          // fetch the last commit information for this file
          const commits = await fetchFromGitHub<any[]>(`/repos/${repository.fullName}/commits?path=${content.path}&per_page=1&sha=${version.version}`);
          const lastUpdateDate = commits.length > 0 ? commits[0].commit.committer.date : 'unknown';

          let fileContent = await (await fetch(content.downloadUrl)).text();
          // process content
          for (const processor of contentProcessors) {
            fileContent = await processor(fileContent, repository, version, content);
          }

          const node: FileNode = {
            type: 'file',
            name: key,
            displayName: getPageTitle(key, fileContent),
            path: [ ...directoryPath, key ],
            content: fileContent,
            lastUpdateDate
          };

          entries.push([ content.name, node ]);
          continue;
        }
      }

      if (type === 'dir') {
        const newParent = {};
        await fetchDocsAtAndFillInto(content.path, newParent);
        if (Object.entries(newParent).length > 0) {
          const directoryNode: DirectoryNode = {
            type: 'dir',
            name: content.name,
            displayName: filenameToDisplayName(content.name),
            content: newParent
          };
          entries.push([ content.name, directoryNode ]);
        }
      }
    }

    if (index) {
      // if there is an index defined, use it
      entries.sort(([ aKey ], [ bKey ]) => {
        const leftFirst = 1, rightFirst = -1, equal = 0;
        const aIndex = index!.indexOf(aKey);
        const bIndex = index!.indexOf(bKey);
        if (aIndex !== -1) {
          if (bIndex !== -1) {
            return aIndex - bIndex;
          } else {
            return leftFirst;
          }
        } else {
          if (bIndex !== -1) {
            return rightFirst;
          } else {
            if (aKey > bKey) return leftFirst;
            if (bKey < aKey) return rightFirst;
            return equal;
          }
        }
      });
    }

    for (const [ key, node ] of entries) {
      if (node.type === 'file') {
        const nameWithoutExt = key.slice(0, -PAGE_SUFFIX.length);
        into[nameWithoutExt] = node;
      } else {
        into[key] = node;
      }
    }
  }

  // fetch docs at '/docs/' and fill into root documentation content
  await fetchDocsAtAndFillInto(ROOT_FOLDER, documentation.content);

  if (Object.entries(documentation.content).length === 0) {
    // no documentation found
    return null;
  } else {
    return documentation;
  }
}

function getPageTitle(filename: string, html: string) {
  for (const tag of [ 'h1', 'h2' ]) {
    const open = `<${tag}>`;
    const close = `</${tag}>`;
    const start = html.indexOf(open) + open.length;
    const end = html.indexOf(close, start);

    if (start !== -1 && end !== -1) {
      // Found a user-provided title for
      // this section, use this
      return html.substring(start, end);
    }
  }

  return filenameToDisplayName(filename);
}

function filenameToDisplayName(filename: string): string {
  return filename.split(/[-_\s]+/g)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}