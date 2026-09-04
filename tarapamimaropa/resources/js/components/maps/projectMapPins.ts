import { PROGRAM_META, type TaraProject } from "../../constants/taraProjects";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type MapProject = Pick<
  TaraProject,
  "id" | "name" | "program" | "province" | "status" | "progress" | "latitude" | "longitude"
> & {
  municipality?: string;
};

export const buildProjectPinHtml = (
  project: MapProject,
  isActive: boolean,
): string => {
  const meta = PROGRAM_META[project.program];
  const classes = [
    "project-pin",
    meta?.pinClass ?? "project-pin--hub",
    isActive ? "project-pin--active" : "",
    project.status === "delayed" ? "project-pin--alert" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="${classes}" data-project-id="${escapeHtml(project.id)}">
      <div class="project-pin__pulse"></div>
      <div class="project-pin__core" title="${escapeHtml(project.name)}">
        <span class="project-pin__glyph">${escapeHtml(meta?.short ?? "PRJ")}</span>
      </div>
      <div class="project-pin__point"></div>
    </div>
  `;
};
