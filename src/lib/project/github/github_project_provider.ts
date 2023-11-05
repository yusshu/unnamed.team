import Project, { ProjectMap } from "@/lib/project/project";
import { fetchOrganizationRepositories } from "@/lib/project/github/github";
import { fetchVersions } from "@/lib/project/github/github_version_provider";

export async function fetchProjects(): Promise<ProjectMap> {
  const organization = 'unnamed';

  const projects: ProjectMap = {};

  for (const repository of await fetchOrganizationRepositories(organization)) {
    if (repository.private || repository.archived) {
      // skip private and archived repositories
      continue;
    }

    // fetch versions
    const versions = await fetchVersions(repository);

    const project: Project = {
      name: repository.name,
      displayName: repository.name,
      description: repository.description ?? '',
      stars: repository.stargazersCount,
      latestVersion: versions.latest,
      versions: versions.versions
    };

    projects[project.name] = project;
  }

  return projects;
}