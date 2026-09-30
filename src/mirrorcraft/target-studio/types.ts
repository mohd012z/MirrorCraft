import type { WebNodeKind } from "@/mirrorcraft/web-structure/types";

export type MirrorTargetKind = "project" | "route" | "page" | "component" | "dom" | "style" | "token" | "asset" | "interaction" | "source" | "finding";
export interface SourceRange { startLine: number; endLine: number; }
export interface MirrorTarget { id:string; kind:MirrorTargetKind; label:string; webNodeKind?:WebNodeKind; route?:string; file?:string; symbol?:string; selector?:string; sourceRange?:SourceRange; dependencies:string[]; dependents:string[]; viewports:number[]; findingIds:string[]; evidenceIds:string[]; metadata?:Record<string,unknown>; }
export interface TargetContext { target:MirrorTarget; sourceFiles:string[]; styles:string[]; assets:string[]; routes:string[]; interactions:string[]; affectedTargets:string[]; affectedViewports:number[]; evidence:string[]; findings:string[]; confidence:number; unresolved:string[]; }
export type MirrorCommandName = "inspect"|"impact"|"watch"|"modify"|"rectify"|"preview"|"compare"|"recheck"|"verify"|"copy";
export interface MirrorCommand { id:string; command:MirrorCommandName; targetId:string; mode:"read"|"virtual"|"real"; intent?:string; preserve?:string[]; verification?:{viewports?:number[];visual?:boolean;structural?:boolean;behavioral?:boolean;tests?:boolean}; }
export interface ImpactReport { targetId:string; affectedFiles:string[]; affectedComponents:string[]; affectedRoutes:string[]; affectedInteractions:string[]; affectedViewports:number[]; affectedTests:string[]; affectedFindings:string[]; requiresBuild:boolean; requiresCapture:boolean; requiresBehaviorTest:boolean; }
export interface RevalidationPlan { required:boolean; fullProject:boolean; routes:string[]; viewports:number[]; tests:string[]; visual:boolean; structural:boolean; behavioral:boolean; build:boolean; }
export interface ChangeWatchResult { addedTargetIds:string[]; removedTargetIds:string[]; changedTargetIds:string[]; impact:ImpactReport; revalidation:RevalidationPlan; }
export interface TargetResolutionCandidate { target:MirrorTarget; confidence:number; reasons:string[]; }
export interface TargetResolution { selected:TargetResolutionCandidate|null; candidates:TargetResolutionCandidate[]; ambiguous:boolean; }
