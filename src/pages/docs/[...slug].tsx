import { GetStaticProps } from "next";
import Project, { ProjectMap } from "@/lib/project/project";
import Version from "@/lib/project/version";
import projectMapCache from "@/lib/server/project_map_cache";
import Header from "@/components/layout/Header";
import { DirectoryNode, findFileNodeInTree, Node } from "@/lib/project/documentation/documentation_node";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { DocumentationContextProvider, DocumentationData } from "@/context/DocumentationContext";
import { trimStringArray } from "@/lib/string";
import Metadata from "@/components/Metadata";
import Select from "@/components/Select";
import { Bars3Icon } from "@heroicons/react/24/solid";
import DocumentationSideBar from "@/components/docs/DocumentationSideBar";
import clsx from "clsx";
import styles from "@/pages/docs/docs.module.scss";
import DocumentationNavigationButtons from "@/components/docs/DocumentationNavigationButtons";
import DocumentationFooter from "@/components/docs/DocumentationFooter";

interface PageProps {
  project: Project;
  version: Version;
  path: string[];
}

export default function Docs({ project, ...props }: PageProps) {
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

    let version = documentation.project.latestVersion!;
    let versionName =  path.shift(); // remove the version
    if (!versionName || documentation.project.versions[versionName] === undefined) {
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
      file: file!
    });
  }, [ router ]);

  return (
    <DocumentationContextProvider state={[ documentation, s => { setDocumentation(s); console.log(`Version changed to ${(s as any)["version"].version}`); } ]}>
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
                  version: version
                });
                console.log(`Set documentation version to ${version.version}`);
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

export async function getStaticPaths() {
  const projects: ProjectMap = await projectMapCache.get();
  const paths: any[] = [];

  function addPath(path: string[]) {
    paths.push({
      params: {
        slug: path,
      },
    });
  }

  async function it(key: string, node: Node<any>, path: string[]) {
    addPath([ ...path, key ]);
    if (node.type === 'dir') {
      for (const [ childKey, childNode ] of Object.entries((node as DirectoryNode).content)) {
        await it(childKey, childNode, [ ...path, key ]);
      }
    }
  }

  for (const project of Object.values(projects)) {

    // root path
    addPath([ project.name ]);

    // section paths
    if (project.latestVersion) {
      const documentation = project.latestVersion.documentation;
      if (documentation != null) {
        addPath([ project.name, "latest" ]);
        for (const [ key, node ] of Object.entries(documentation)) {
          await it(key, node, [ project.name ]);
          await it(key, node, [ project.name, "latest" ]);
        }
      }
    }
    if (project.versions) {
      for (const [ versionName, version ] of Object.entries(project.versions)) {
        addPath([ project.name, versionName ]);
        if (version.documentation) {
          for (const [ key, node ] of Object.entries(version.documentation)) {
            await it(key, node, [ project.name, versionName ]);
          }
        }
      }
    }
  }

  return {
    paths,
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const projects = await projectMapCache.get();
  const [ projectName, ...path ] = params!['slug'] as string[];
  const project = projects[projectName];

  // check version
  let tag;
  if (path.length === 0) {
    tag = 'latest';
  } else {
    tag = path[0];
    if (!project.versions[tag]) {
      // not a valid tag
      tag = 'latest';
    } else {
      path.shift();
    }
  }

  const version: Version | null = tag === 'latest' ? project.latestVersion : project.versions[tag];

  if (!version) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      project,
      version,
      path,
    },
  };
};