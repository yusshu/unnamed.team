import Cache from '@/lib/server/cache';
import { ProjectMap } from "@/lib/project/project";
import { fetchProjects } from "@/lib/project/github/github_project_provider";

const cache = new Cache<ProjectMap>(
  fetchProjects,
  'projects',
  1000 * 60 * 15 // 15 minutes
);

export default cache;