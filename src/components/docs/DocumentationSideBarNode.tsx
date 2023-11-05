import { useRouter } from "next/router";
import clsx from "clsx";
import { useDocumentationContext } from "@/context/DocumentationContext";
import { arrayEqual } from "@/lib/equality";
import { DirectoryNodeContent, FileNode, openFileNode } from "@/lib/project/documentation/documentation_node";

interface NodeElementProps {
  tree: DirectoryNodeContent;
  currentRoute: string[];
}

/**
 * Creates the elements for the given tree
 * node, will recurse to obtain a full element
 * tree for every subtree
 *
 * @returns {JSX.Element} The elements for the tree
 */
export default function DocumentationSideBarNode({ tree, currentRoute }: NodeElementProps) {

  const [ documentation, setDocumentation ] = useDocumentationContext();

  const router = useRouter();
  const indent = tree !== documentation.version.documentation?.content;

  const fileChildren = Object.entries(tree).filter(([ _, node ]) => node.type === 'file') as [ string, FileNode ][];
  const dirChildren = Object.entries(tree).filter(([ _, node ]) => node.type === 'dir');

  return (
    <ul className={clsx('flex flex-col gap-2', indent && 'gap-4')}>

      {/* File entries */}
      {fileChildren.map(([ key, node ]) => {
        return (
          <li
            key={key}
            className={clsx('flex flex-col gap-1', indent && 'pl-4')}
            onClick={() => {
              setDocumentation({
                ...documentation,
                sideBarVisible: false,
                file: node
              });
              openFileNode(router, documentation.project, documentation.version, node).catch(console.error);
            }}>
            <span
              className={clsx(
                'text-base cursor-pointer flex flex-row items-center gap-2',
                arrayEqual(node.path, documentation.file.path) ? 'font-normal text-pink-200' : 'font-light text-white/60',
              )}>
              <span className={clsx(arrayEqual(node.path, documentation.file.path) ? 'w-1.5 h-1.5 rounded-full bg-pink-200' : 'hidden')}></span>
              <span>{node.displayName}</span>
            </span>
          </li>
        );
      })}

      {/* Directory entries */}
      {dirChildren.map(([ key, node ]) => (
        <li
          key={key}
          className={clsx(
            'flex flex-col gap-1 mt-4',
            indent && 'pl-4',
          )}>

          <span className="text-base font-normal text-white/80">{node.displayName}</span>

          <DocumentationSideBarNode
            tree={node.content as DirectoryNodeContent}
            currentRoute={[ ...currentRoute, key ]}
          />
        </li>
      ))}
    </ul>
  );
}