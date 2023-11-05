import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { PAGE_SUFFIX, ROOT_FOLDER } from "@/lib/project/github/github_documentation_provider";
import Version from "@/lib/project/version";
import { GitHubContent, GitHubRepository } from "@/lib/project/github/github";

export default async function markdownToHtml(markdown: string, repository: GitHubRepository, version: Version, content: GitHubContent): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm) // support GitHub Flavored Markdown (tables, autolinks, task lists, strikethrought)
    .use(remarkRehype)
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeRewriteLinks, { repository, version, content })
    .use(rehypeStringify as any);

  return String(await processor.process(markdown));
}

function rehypeRewriteLinks(options: { repository: GitHubRepository, version: Version, content: GitHubContent }) {
  // based on https://github.com/unifiedjs/unifiedjs.github.io/blob/main/generate/plugin/rehype-rewrite-urls.js
  const { repository, version, content } = options;
  return (tree: any) => {
    visit(tree, 'element', node => {
      if (node.tagName === 'a') {
        const ref = node.properties.href;
        if (ref !== undefined && ref !== null && !ref.startsWith('https://') && ref.endsWith(PAGE_SUFFIX)) {
          const rawPath = ref.slice(0, -PAGE_SUFFIX.length);
          const path = new URL(rawPath, 'https://example.com' /* base doesn't really matter*/).pathname;

          const newHref = [];
          // new href is formatted like: /docs/<project>/<version>/<path>
          newHref.push(ROOT_FOLDER);
          newHref.push(repository.name);
          if (!version.latest) {
            // version is not specified if latest
            newHref.push(version.version);
          }
          newHref.push(content.path.substring(ROOT_FOLDER.length + 1, content.path.length - content.name.length - 1));
          newHref.push(path);
          node.properties.href = newHref.join('/');
        }
      } else if (node.tagName === 'img') {
        // rewrite image src's
        const src = node.properties.src;
        if (src !== undefined && src !== null && !src.startsWith('https://')) {
          const path = new URL(src, 'https://example.com').pathname;
          node.properties.src = `https://raw.githubusercontent.com/${repository.fullName}/${version.version}/${path}`;
        }
      }
    });
  };
}