import * as strings from "@/lib/string";

export default async function replaceNexusVersions(input: string): Promise<string> {
  // format is like:
  //   %%REPLACE_what{the_argument}%%
  // for example:
  //   %%REPLACE_latestRelease{team.unnamed:creative-central-api}%%
  const latestVersionRegex = /%%REPLACE_([^%]+)\{([^%]+)}%%/g;

  return await strings.replaceAsync(input, latestVersionRegex, async (match, whatToReplace, argument) => {
    if (whatToReplace === 'latestRelease' || whatToReplace === 'latestVersion' || whatToReplace === 'latestReleaseOrSnapshot') {
      const [ groupId, artifactId ] = argument.split(':');
      const versioning = await fetchVersioning(groupId, artifactId);

      if (whatToReplace === 'latestRelease') {
        return versioning.release ?? 'unknown';
      } else if (whatToReplace === 'latestVersion') {
        return versioning.latest;
      } else {
        return versioning.release ?? versioning.latest;
      }
    } else {
      return match;
    }
  });
}


const BASE_URL = process.env.nexusUrl!;
const DEFAULT_REPOSITORY = process.env.mavenDefaultRepository!;

interface Versions {
  latest: string;
  release: string | null;
}

const versionCache = new Map<string, Versions>();

export async function fetchVersioning(groupId: string, artifactId: string): Promise<Versions> {

  const key = `${groupId}:${artifactId}`;
  let versions = versionCache.get(key);

  if (versions) {
    return versions;
  }

  const location = `${groupId.replace(/\./g, '/')}/${artifactId}`;
  const url = `${BASE_URL}/repository/${DEFAULT_REPOSITORY}/${location}/maven-metadata.xml`;

  const response = await fetch(url);
  const xml = await response.text();

  try {
    const latest = xml.match(/(?<=<latest>)[^<]+(?=<\/latest>)/g)![0];
    const releaseMatches = xml.match(/(?<=<release>)[^<]+(?=<\/release>)/g);

    versions = {
      latest,
      release: releaseMatches ? releaseMatches[0] : null
    };
    versionCache.set(key, versions);
    return versions;
  } catch (e) {
    throw new Error(`Failed to parse versioning for ${groupId}:${artifactId}: ${e} : XML: ${xml}`);
  }
}