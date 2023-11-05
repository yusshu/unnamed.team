import { createContext, ReactNode, useContext } from 'react';
import { MutState } from "@/context/context";
import Version from "@/lib/project/version";
import Project from "@/lib/project/project";
import { FileNode } from "@/lib/project/documentation/documentation_node";

const DocumentationContext = createContext<MutState<DocumentationData>>(
  [ null as unknown as DocumentationData, () => {} ] /* we do a little bit of type trolling */
);

export interface DocumentationData {

  // True if the sidebar is visible
  sideBarVisible: boolean;

  // The documented project
  project: Project;

  // The tag
  version: Version;

  // The file being viewed
  file: FileNode;
}

export function DocumentationContextProvider({ state, children }: { state: MutState<DocumentationData>, children: ReactNode }) {
  return (
    <DocumentationContext.Provider value={state}>
      {children}
    </DocumentationContext.Provider>
  );
}

export function useDocumentationContext() {
  return useContext(DocumentationContext);
}