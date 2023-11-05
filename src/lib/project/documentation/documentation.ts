import { DirectoryNodeContent } from "@/lib/project/documentation/documentation_node";

interface Documentation {
  /**
   * The documentation contents.
   */
  readonly content: DirectoryNodeContent;
}

export default Documentation;