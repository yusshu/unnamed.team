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
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { capitalize } from '@/lib/string';
import Cache from '@/lib/cache';

const INDEX_FILE_NAME = 'index.txt';
const PAGE_SUFFIX = '.md';
const ROOT_FOLDER = 'docs';
const API_URL = 'https://api.github.com';
const TITLES: {
  [ filename: string ]: string;
} = {
  'readme.md': 'Read Me',
  'getting-started.md': 'Getting Started'
};

export interface DocTree {
  [ key: string ]: DocFile | DocDir
}

export interface DocNode {
  type: 'dir' | 'file';
  name: string;
}

export interface DocFile extends DocNode {
  type: 'file';
  htmlUrl: string;
  content: string;
}

export interface DocDir extends DocNode {
  type: 'dir';
  content: DocTree;
}

export interface GitHubRepo {
  fullName: string;
  name: string;
  description: string;
  stars: number;
  defaultBranch: string;
  docs: DocTree;
}

export interface GitHubRepos {
  [ name: string ]: GitHubRepo;
}

/**
 * @param {string} endpoint The endpoint, appended
 * to API_URL constant
 * @return {Promise<any>} The fetch data
 */
async function githubFetch(endpoint: string): Promise<any> {
  const accessToken = process.env.GITHUB_ACCESS_TOKEN;
  const url = API_URL + endpoint;
  const response = accessToken ? (await fetch(url, { headers: { Authorization: `token ${accessToken}` } })) : (await fetch(url));
  return await response.json();
}

export async function fetchGitHubData(organization: string): Promise<GitHubRepos> {
  const rawRepos = await githubFetch(`/orgs/${organization}/repos`);

  const repos: GitHubRepos = {};

  for (const raw of rawRepos) {
    const repo: GitHubRepo = {
      name: raw.name,
      fullName: raw.full_name,
      description: raw.description,
      stars: raw.watchers,
      defaultBranch: raw.default_branch,
      docs: {}
    };
    await fetchDocs(repo);
    if (Object.entries(repo.docs).length > 0) {
      console.log(`[INFO] Discovered documented repository \`${repo.name}\``);
      repos[repo.name] = repo;
    }
  }

  return repos;
}

/**
 * Fetch the documentation for a given GitHub repository
 *
 * @param {GitHubRepo} repo The repository partial object,
 */
export async function fetchDocs(repo: GitHubRepo) {

  const basePath = `/${ROOT_FOLDER}/${repo.name}`;
  let currPath = '/';

  const repoFullName = repo.fullName;

  function rehypeRewriteLinks() {
    return (tree: any) => {
      // based on https://github.com/unifiedjs/unifiedjs.github.io/blob/main/generate/plugin/rehype-rewrite-urls.js
      visit(tree, 'element', node => {
        if (node.tagName === 'a') {
          const ref = node.properties.href;
          if (ref !== undefined && ref !== null && !ref.startsWith('https://') && ref.endsWith(PAGE_SUFFIX)) {
            const rawPath = ref.slice(0, -PAGE_SUFFIX.length);
            const path = new URL(rawPath, 'https://example.com' /* base doesn't really matter*/).pathname;
            node.properties.href = basePath + currPath + path;
          }
        } else if (node.tagName === 'img') {
          // rewrite image src's
          const src = node.properties.src;
          if (src !== undefined && src !== null && !src.startsWith('https://')) {
            const path = new URL(src, 'https://example.com').pathname;
            node.properties.src = `https://github.com/${repo.fullName}/raw/${repo.defaultBranch}/${path}`;
          }
        }
      });
    };
  }

  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeRewriteLinks)
    .use(rehypeStringify as any);

  async function parse(markdown: string) {
    return String(await processor.process(markdown));
  }

  async function at(parent: DocTree, path: string): Promise<DocTree | null> {
    const contents = await githubFetch(`/repos/${repoFullName}/contents/${path}`);

    if (contents.message === 'Not Found') {
      return Promise.resolve(null);
    }

    const entries: Array<[ string, DocFile | DocDir ]> = [];
    let index: string[] | null = null;

    for (const content of contents) {
      const type = content.type;
      if (type === 'file') {
        if (content.name === INDEX_FILE_NAME) {
          const txt = await (await fetch(content.download_url)).text();
          index = txt.split(/\r?\n/g).map(name => name.trim());
        } else if (content.name.endsWith(PAGE_SUFFIX)) {
          // found a file that ends with .md, must be a documentation page
          const key = content.name.slice(0, -PAGE_SUFFIX.length);
          currPath = path.substring(Math.min(ROOT_FOLDER.length, path.length));
          const html = await parse(await (await fetch(content.download_url)).text());
          entries.push([
            content.name,
            {
              type: 'file',
              name: formatFileName(key, html),
              htmlUrl: content.html_url,
              content: html
            } as DocFile
          ]);
        }
      } else {
        const newParent = {};
        await at(newParent, content.path);
        if (Object.entries(newParent).length > 0) {
          entries.push([
            content.name,
            {
              type: 'dir',
              name: capitalize(content.name),
              content: newParent
            } as DocDir
          ]);
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
        parent[nameWithoutExt] = node;
      } else {
        parent[key] = node;
      }
    }

    return parent;
  }

  repo.docs = await at({}, ROOT_FOLDER) || {};
}

function formatFileName(filename: string, html: string) {
  for (const tag of [ 'h1', 'h2' ]) {
    const open = `<${tag}>`;
    const close = `</${tag}>`;
    const start = html.indexOf(open) + open.length;
    const end = html.indexOf(close, start);

    if (start !== -1 && end !== -1) {
      // Found an user-provided title for
      // this section, use this
      return html.substring(start, end);
    }
  }

  return TITLES[filename] ?? capitalize(filename);
}

export const cache = new Cache<GitHubRepos>(
  async () => await fetchGitHubData(process.env.githubSlug!),
  'github',
  1000 * 60 * 5, // 5 minutes
);