import Documentation from "@/lib/project/documentation/documentation";

interface Version {
  /**
   * The version name. e.g. `1.0.0`.
   */
  version: string;

  /**
   * Is this the latest version?
   */
  latest: boolean;

  /**
   * The documentation for this version.
   */
  documentation: Documentation | null;
}

export default Version;