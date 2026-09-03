import rawDocument from "./chromium-glossary.json";
import { defineGlossary } from "../domain/glossary";

export const chromiumGlossary = defineGlossary(rawDocument);
