import { fetchFromGitHub, GitHubRepository } from "@/lib/project/github/github";
import Version from "@/lib/project/version";
import { fetchDocumentation } from "@/lib/project/github/github_documentation_provider";

export interface FetchVersions {
  latest: Version | null;
  versions: { [ version: string ]: Version };
}

/**
 * Fetches a list of versions for a given GitHub repository, uses
 * GitHub releases API.
 *
 * @param repository The repository
 */
export async function fetchVersions(repository: GitHubRepository): Promise<FetchVersions> {
  const releases = await fetchFromGitHub<any[]>(`/repos/${repository.fullName}/releases`);

  if (releases.length === 0) {
    // no releases in GitHub means no versions available here
    return { latest: null, versions: { } };
  }

  // first release in the array is the latest version
  const latest = releaseToVersion(releases.shift(), /* latest= */ true);

  // convert releases to versions
  const versions: { [ version: string ]: Version } = {};
  for (const release of releases) {
    const version = releaseToVersion(release, false);
    versions[version.version] = version;
  }

  // also put the latest version in the versions object
  versions[latest.version] = latest;

  // fetch documentation for all versions
  for (const version of Object.values(versions)) {
    version.documentation = await fetchDocumentation(repository, version);
  }

  return { latest, versions };
}

function releaseToVersion(release: any, latest: boolean): Version {
  return {
    version: release.tag_name,
    latest,
    documentation: null
  };
}