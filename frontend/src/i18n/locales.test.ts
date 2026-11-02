import { NAMESPACES, resources, SUPPORTED_LANGUAGES } from "./index";

function keys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null ? keys(child, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
}

describe("translations", () => {
  it.each(NAMESPACES)("namespace %s defines the same keys in every supported language", (namespace) => {
    const expected = keys(resources.en[namespace] ?? {}).sort();
    expect(expected.length).toBeGreaterThan(0);

    for (const language of SUPPORTED_LANGUAGES) {
      expect(resources[language][namespace], `${language}/${namespace} is missing`).toBeDefined();
      expect(keys(resources[language][namespace]).sort()).toEqual(expected);
    }
  });
});
