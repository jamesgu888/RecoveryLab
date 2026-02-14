declare module "@darshanpatel2608/human-body-react" {
  import { FC } from "react";

  export interface PartSelect {
    selected?: boolean;
    show?: boolean;
    clickable?: boolean;
  }

  export interface PartsInput {
    head?: PartSelect;
    chest?: PartSelect;
    stomach?: PartSelect;
    left_shoulder?: PartSelect;
    right_shoulder?: PartSelect;
    left_arm?: PartSelect;
    right_arm?: PartSelect;
    left_hand?: PartSelect;
    right_hand?: PartSelect;
    left_leg_upper?: PartSelect;
    right_leg_upper?: PartSelect;
    left_leg_lower?: PartSelect;
    right_leg_lower?: PartSelect;
    left_foot?: PartSelect;
    right_foot?: PartSelect;
  }

  export interface BodyComponentProps {
    onClick?: (id: string) => void;
    onChange?: (parts: PartsInput) => void;
    partsInput?: PartsInput;
    mode?: "missing" | "pain";
    height?: string;
    width?: string;
  }

  export const BodyComponent: FC<BodyComponentProps>;
}
