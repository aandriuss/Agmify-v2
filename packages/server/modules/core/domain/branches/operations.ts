import { Branch, ModelTreeItem } from '@/modules/core/domain/branches/types'
import { BranchLatestCommit } from '@/modules/core/domain/commits/types'
import {
  ModelsTreeItemCollection,
  ProjectModelsArgs,
  ProjectModelsTreeArgs
} from '@/modules/core/graph/generated/graphql'
import { ModelsTreeItemGraphQLReturn } from '@/modules/core/helpers/graphTypes'
import { Nullable, Optional } from '@speckle/shared'
import { Merge } from 'type-fest'

export type GenerateBranchId = () => string

export type GetBranchesByIds = (
  branchIds: string[],
  options?: Partial<{
    streamId: string
  }>
) => Promise<Branch[]>

export type GetBranchById = (
  branchId: string,
  options?: Partial<{
    streamId: string
  }>
) => Promise<Optional<Branch>>

export type GetStreamBranchesByName = (
  streamId: string,
  names: string[],
  options?: Partial<{
    startsWithName: boolean
  }>
) => Promise<Branch[]>

export type GetStreamBranchByName = (
  streamId: string,
  name: string
) => Promise<Nullable<Branch>>

export type GetBranchLatestCommits = (
  branchIds?: string[],
  streamId?: string,
  options?: Partial<{
    limit: number
  }>
) => Promise<BranchLatestCommit[]>

export type GetStructuredProjectModels = (projectId: string) => Promise<ModelTreeItem>

export type GetPaginatedProjectModelsItems = (
  projectId: string,
  params: ProjectModelsArgs
) => Promise<{
  items: Branch[]
  cursor: string | null
}>

export type GetPaginatedProjectModelsTotalCount = (
  projectId: string,
  params: ProjectModelsArgs
) => Promise<number>

export type GetPaginatedProjectModels = (
  projectId: string,
  params: ProjectModelsArgs
) => Promise<{
  totalCount: number
  items: Branch[]
  cursor: string | null
}>

export type GetModelTreeItemsFiltered = (
  projectId: string,
  args: ProjectModelsTreeArgs,
  options?: Partial<{
    filterOutEmptyMain: boolean
  }>
) => Promise<ModelsTreeItemGraphQLReturn[]>

export type GetModelTreeItemsFilteredTotalCount = (
  projectId: string,
  args: ProjectModelsTreeArgs,
  options?: Partial<{
    filterOutEmptyMain: boolean
  }>
) => Promise<number>

export type GetProjectTopLevelModelsTree = (
  projectId: string,
  args: ProjectModelsTreeArgs,
  options?: Partial<{
    filterOutEmptyMain: boolean
  }>
) => Promise<
  Merge<
    ModelsTreeItemCollection,
    {
      items: ModelsTreeItemGraphQLReturn[]
    }
  >
>
