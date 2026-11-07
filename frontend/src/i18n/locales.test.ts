import { ERROR_CODES } from "@wildhand/shared";
import i18n, { COMMON_NAMESPACE, NAMESPACES, resources, SUPPORTED_LANGUAGES } from "./index";

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

  it.each(SUPPORTED_LANGUAGES)("resolve every nested $t() reference in %s", (language) => {
    const t = i18n.getFixedT(language);
    for (const namespace of NAMESPACES) {
      for (const key of keys(resources[language][namespace] ?? {})) {
        // Plural keys are looked up by their base key with a count.
        const [, base, plural] = /^(.*?)(_one|_other)?$/.exec(key)!;
        const text = t(`${namespace}:${base}`, plural ? { count: plural === "_one" ? 1 : 2 } : {});
        expect(text, `${language}/${namespace}:${key}`).not.toContain("$t(");
      }
    }
  });

  it("translate every server error code in the common namespace", () => {
    const translated = keys(resources.en[COMMON_NAMESPACE]);
    const missing = ERROR_CODES.filter((code) => !translated.includes(`errors.${code}`));
    expect(missing).toEqual([]);
  });
});
