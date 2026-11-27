import type { Scenario } from "./engine";
import quickbasket from "./scenarios/quickbasket.json";
import padhoai from "./scenarios/padhoai.json";
import paysetu from "./scenarios/paysetu.json";
import zipride from "./scenarios/zipride.json";
import carenow from "./scenarios/carenow.json";
import billbook from "./scenarios/billbook.json";
import reeldesi from "./scenarios/reeldesi.json";
import stayeasy from "./scenarios/stayeasy.json";

/** "Build a product" stories. Check balance with scripts/balance-sim.mts before adding one. */
export const SCENARIOS = [quickbasket, padhoai, paysetu, zipride, carenow, billbook, reeldesi, stayeasy] as unknown as Scenario[];

export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id) ?? null;
