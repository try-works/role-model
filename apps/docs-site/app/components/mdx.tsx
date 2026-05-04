import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import {
  ProtocolLifecycleDiagram,
  ProtocolObjectModelDiagram,
  ProtocolPipelineDiagram,
  RoleModelRoutingDiagram,
  RoutingFlowDiagram,
  RoutingObservabilityDiagram,
} from "./docs-diagrams";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    h1: () => null,
    ProtocolLifecycleDiagram,
    ProtocolObjectModelDiagram,
    ProtocolPipelineDiagram,
    RoleModelRoutingDiagram,
    RoutingFlowDiagram,
    RoutingObservabilityDiagram,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
