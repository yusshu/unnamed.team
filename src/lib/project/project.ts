import Version from "@/lib/project/version";

interface Project {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;

  // number of stars given to this project by the community
  readonly stars: number;

  // versions
  readonly latestVersion: Version | null;
  readonly versions: { [ version: string ]: Version };
}

export interface ProjectMap {
  [ name: string ]: Project;
}

export default Project;

export function hasDocumentation(project: Project): boolean {
  for (const version of Object.values(project.versions)) {
    if (version.documentation != null) {
      return true;
    }
  }
  return false;
}