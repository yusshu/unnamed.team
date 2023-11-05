import { useEffect, useState } from 'react';

import styles from './docs.module.scss';
import Header from '../../components/layout/Header';
import clsx from 'clsx';
import { GetServerSidePropsContext } from "next";
import DocumentationSideBar from "@/components/docs/DocumentationSideBar";
import Metadata from "@/components/Metadata";
import { Bars3Icon } from "@heroicons/react/24/solid";
import DocumentationFooter from "@/components/docs/DocumentationFooter";
import { DocumentationContextProvider, DocumentationData } from "@/context/DocumentationContext";
import { useRouter } from "next/router";
import { trimStringArray } from "@/lib/string";
import DocumentationNavigationButtons from "@/components/docs/DocumentationNavigationButtons";
import Select from "@/components/Select";
import Project, { hasDocumentation } from "@/lib/project/project";
import Version from "@/lib/project/version";
import { findFileNodeInTree } from "@/lib/project/documentation/documentation_node";
import projectMapCache from "@/lib/server/project_map_cache";

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

export async function getServerSideProps({ req, res, params }: GetServerSidePropsContext) {
  if (!params || !params['slug']) {
    return { notFound: true };
  }

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=10, stale-while-revalidate=59',
  );

  const slug = params!['slug'] as string[];
  if (slug.length < 1) {
    // we need the project name at least
    return { notFound: true };
  }

  const projectName = slug.shift()!;

  const projects = await projectMapCache.get();
  const project = projects[projectName];

  if (!hasDocumentation(project)) {
    // project is not documented
    return { notFound: true };
  }

  // check tag
  let version;
  if (slug.length === 0) {
    version = project.latestVersion;
  } else {
    const versionName = slug[0];
    if (!project.versions[versionName]) {
      // not a valid tag
      version = project.latestVersion;
    } else {
      slug.shift();
    }
  }

  return {
    props: {
      project,
      version,
      path: slug,
    },
  };
}