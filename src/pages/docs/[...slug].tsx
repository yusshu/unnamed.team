import { GetServerSidePropsContext } from "next";
import Project, { hasDocumentation } from "@/lib/project/project";
import Version from "@/lib/project/version";
import projectMapCache from "@/lib/server/project_map_cache";
import DocumentationScreen from "@/components/docs/DocumentationScreen";
import Header from "@/components/layout/Header";
import Head from "next/head";

interface PageProps {
  project: Project;
  version: Version | null;
  path: string[];
}

export default function Docs({ project, version, path }: PageProps) {
  if (!version) {
    return (
      <>
        <Head>
          <title>{`No documentation for ${project.name}`}</title>
        </Head>
        <Header />
        <div className="flex flex-col items-center gap-4 my-10 p-8">
          <h1 className="text-white/80 font-medium text-6xl text-center">
            We are sorry!
          </h1>
          <div className="text-white/70 font-light text-lg text-center">
            <p>{project.name} does not have any documentation yet.</p>
          </div>
        </div>
      </>
    );
  } else {
    return <DocumentationScreen project={project} version={version} path={path} />;
  }
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

  if (!project) {
    // project does not exist
    return { notFound: true };
  } else if (!hasDocumentation(project)) {
    // project is not documented
    return { props: { project, version: null, path: [] } };
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