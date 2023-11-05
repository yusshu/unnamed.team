/**
 * @fileoverview Defines the node types used in a version documentation tree.
 * Note that documentation trees exist per version, so the nodes and contents
 * are also version-specific.
 */
import Project from "@/lib/project/project";
import Version from "@/lib/project/version";
import { NextRouter } from "next/router";

export type NodeType = 'dir' | 'file';

/**
 * Represents a node in a tree of files and
 * directories.
 */
export interface Node<TContentType> {
  /**
   * The type of the node. Can be either
   * `dir` or `file`.
   */
  readonly type: NodeType;

  /**
   * The node name. File name or directory
   * name.
   */
  readonly name: string;

  /**
   * The node display name.
   */
  readonly displayName: string;

  /**
   * The node content. If the node is a
   * directory, this will be a nested
   * object of the same type. If the node
   * is a file, this will be the file's
   * content.
   */
  readonly content: TContentType;
}

export interface DirectoryNodeContent {
  [ name: string ]: Node<any>;
}

export interface DirectoryNode extends Node<DirectoryNodeContent> {
  readonly type: 'dir';
}

export interface FileNode extends Node<string> {
  readonly type: 'file';

  /**
   * The file path, relative to the root
   * of the tree. Contains all the directory
   * names and the file name to reach this
   * file.
   */
  readonly path: string[];

  /**
   * The file's last update date in ISO
   * format, or null if date is unknown.
   */
  readonly lastUpdateDate: string | null;
}

export function findFileNodeInTree(root: DirectoryNodeContent, path: string[]): FileNode | null {
  let current = root;
  let off = 0;
  while (off < path.length) {
    let currentKey = path[off++];
    let node = current[currentKey];

    if (!node) {
      return null;
    } else if (node.type === 'file') {
      return node as FileNode;
    } else {
      current = node.content;
    }
  }

  // ended in a directory, return the first
  // file inside this directory
  return Object.values(current).find(k => k.type === 'file') as FileNode ?? null;
}

export function pathOfFileNode(project: Project, version: Version, node: FileNode): string {
  return `/docs/${project.name}/${version.version}/${node.path.join('/')}`;
}

export async function openFileNode(router: NextRouter, project: Project, version: Version, node: FileNode) {
  return router.push(
    pathOfFileNode(project, version, node),
    undefined,
    { shallow: true, scroll: true },
  );
}