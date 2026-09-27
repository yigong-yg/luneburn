export type LabEventName =
  | "lab_page_view"
  | "estimand_question_change"
  | "estimand_control_commit"
  | "methodology_open"
  | "permalink_copy"
  | "decision_check_answered";

export interface LabEvent {
  readonly name: LabEventName;
  readonly page: "estimands";
  readonly detail: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Provider-neutral and network-free by default. A deployment may listen for
 * `luneburn:lab-event` without coupling product code to an analytics vendor.
 * Values should be coarse scenario parameters only; never add identity data.
 */
export const emitLabEvent = (event: LabEvent): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<LabEvent>("luneburn:lab-event", { detail: event }),
  );
};
