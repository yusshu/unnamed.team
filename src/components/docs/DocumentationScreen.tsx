import Project from "@/lib/project/project";
import Version from "@/lib/project/version";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { DocumentationContextProvider, DocumentationData } from "@/context/DocumentationContext";
import { findFileNodeInTree } from "@/lib/project/documentation/documentation_node";
import { trimStringArray } from "@/lib/string";
import Metadata from "@/components/Metadata";
import Header from "@/components/layout/Header";
import Select from "@/components/Select";
import { Bars3Icon } from "@heroicons/react/24/solid";
import DocumentationSideBar from "@/components/docs/DocumentationSideBar";
import clsx from "clsx";
import styles from "@/pages/docs/docs.module.scss";
import DocumentationNavigationButtons from "@/components/docs/DocumentationNavigationButtons";
import DocumentationFooter from "@/components/docs/DocumentationFooter";

interface DocumentationScreenProps {
  project: Project;
  version: Version;
  path: string[];
}

export default function DocumentationScreen({ project, ...props }: DocumentationScreenProps) {
  const router = useRouter();
  const [ documentation, setDocumentation ] = useState<DocumentationData>({
    sideBarVisible: false,
    project,
    version: props.version,
    file: findFileNodeInTree(props.version.documentation!.content, props.path)!
  });

  useEffect(() => {
    const path = router.asPath.split('/');
    trimStringArray(path);

    path.shift(); // remove 'docs' thing
    path.shift(); // remove the project name

    let version = project.latestVersion!;
    let versionName =  path.shift(); // remove the version
    if (!versionName || project.versions[versionName] === undefined) {
      if (versionName) {
        path.unshift(versionName);
      }
    }

    let file = findFileNodeInTree(version.documentation!.content, path);

    if (file && file.path === documentation.file.path) {
      // already the same, no need to change
      return;
    }

    setDocumentation({
      ...documentation,
      version,
      file: file!
    });
  }, [ router ]);

  return (
    <DocumentationContextProvider state={[ documentation, setDocumentation ]}>
      <Metadata options={{
        title: `${project.name} Documentation`,
        url: `https://unnamed.team/docs/${project.name}`,
        description: project.description
      }} />
      <div className="flex flex-col h-full w-full">

        {/* Fixed header */}
        <Header className="fixed bg-wine-900/80 backdrop-blur-sm z-50">
          <div className="flex flex-1 items-center justify-start px-6">
            <Select
              defaultKey={documentation.version.version}
              options={Object.entries(project.versions).map(([ versionName, version ]) => ({ key: versionName, value: version }))}
              onSelect={version => {
                setDocumentation({
                  ...documentation,
                  file: findFileNodeInTree(version.documentation!.content, [])!,
                  version
                });
                router.push(
                  `/docs/${project.name}/${version.version}`,
                  undefined,
                  { shallow: true, scroll: true }
                );
              }}
            />
          </div>
          <div className="flex md:hidden">
            <button onClick={() => setDocumentation(doc => ({ ...doc, sideBarVisible: !doc.sideBarVisible }))}>
              <Bars3Icon className="w-6 h-6 text-white/80" />
            </button>
          </div>
        </Header>

        {/* Fixed left sidebar */}
        <DocumentationSideBar />

        <div className="w-screen h-full">
          <div className="w-screen lg:max-w-5xl lg:mx-auto flex flex-row justify-end mt-16">
            {/* Content */}
            <main className="w-screen lg:max-w-[768px]">
              <div className="flex flex-col mx-auto">

                {/* The actual content */}
                <div
                  className={clsx('text-white/60 font-light w-screen px-8 lg:w-full z-10', styles.body)}
                  dangerouslySetInnerHTML={{ __html: documentation.file.content }}
                />

                <DocumentationNavigationButtons />
                <DocumentationFooter />
              </div>
            </main>
          </div>
        </div>
      </div>
    </DocumentationContextProvider>
  );
}