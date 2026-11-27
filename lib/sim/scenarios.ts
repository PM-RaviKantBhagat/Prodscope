import type { Scenario } from "./engine";
import quickbasket from "./scenarios/quickbasket.json";
import padhoai from "./scenarios/padhoai.json";
import paysetu from "./scenarios/paysetu.json";

/** "Build a product" stories. Check balance with scripts/balance-sim.mts before adding one. */
export const SCENARIOS = [quickbasket, padhoai, paysetu] as unknown as Scenario[];

export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id) ?? null;
