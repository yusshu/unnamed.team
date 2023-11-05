const API_URL = 'https://api.github.com';

/**
 * @param {string} endpoint The endpoint, appended to API_URL constant
 * @return {Promise<any>} The fetch data
 */
export async function fetchFromGitHub<T>(endpoint: string): Promise<T> {
  const accessToken = process.env.GITHUB_ACCESS_TOKEN;
  const url = API_URL + endpoint;
  if (accessToken) {
    return (await fetch(url, {
      headers: {
        'Authorization': `token ${accessToken}`
      }
    })).json();
  } else {
    return (await fetch(url)).json();
  }
}

export interface GitHubRepository {
  /**
   * The repository simple name, e.g. "ezchat",
   * or "creative".
   */
  name: string;

  /**
   * The repository full name, e.g. "unnamed/ezchat",
   * or "unnamed/creative".
   */
  fullName: string;

  /**
   * Whether the repository is private or not.
   */
  private: boolean;

  /**
   * The repository HTML URL.
   */
  htmlUrl: string;

  /**
   * The repository description.
   */
  description: string | null;

  /**
   * The count of stargazers for this repository.
   */
  stargazersCount: number;

  /**
   * Whether this repository is archived or not.
   */
  archived: boolean;
}

export async function fetchOrganizationRepositories(organization: string): Promise<GitHubRepository[]> {
  const repositories = await fetchFromGitHub<any[]>(`/orgs/${organization}/repos`);
  return repositories.map(raw => ({
    name: raw.name,
    fullName: raw.full_name,
    private: raw.private,
    htmlUrl: raw.html_url,
    description: raw.description,
    stargazersCount: raw.stargazers_count,
    archived: raw.archived
  }));
}

export interface GitHubContent {
  name: string;
  path: string;
  htmlUrl: string;
  downloadUrl: string;
  type: 'file' | 'dir';
}

export async function fetchRepositoryContents(repositoryFullName: string, path: string, ref: string): Promise<GitHubContent[] | null> {
  const contents = await fetchFromGitHub<any | any[]>(`/repos/${repositoryFullName}/contents/${path}?ref=${ref}`);

  if (contents.message === 'Not Found') {
    return Promise.resolve(null);
  }

  return contents.map((raw: any) => ({
    name: raw.name,
    path: raw.path,
    htmlUrl: raw.html_url,
    downloadUrl: raw.download_url,
    type: raw.type
  }));
}