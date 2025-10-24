import { parseEmail } from "@/lib/parseEmail";

describe("parseEmail link extraction", () => {
  it("captures href values from standard anchors", () => {
    const html = `
      <html>
        <body>
          <a href="https://www.tradu.com/eu/support/">Contact us</a>
          <a href="mailto:hello@tradu.com">Email</a>
        </body>
      </html>
    `;

    const result = parseEmail(html);

    expect(result.links).toEqual(
      expect.arrayContaining([
        "https://www.tradu.com/eu/support/",
        "mailto:hello@tradu.com",
      ]),
    );
  });

  it("uses alternative link attributes when href is not usable", () => {
    const html = `
      <html>
        <body>
          <a href="javascript:void(0)" data-href="https://www.tradu.com/eu/additional-insolvency-event-insurance/">
            Learn more
          </a>
        </body>
      </html>
    `;

    const result = parseEmail(html);

    expect(result.links).toEqual(
      expect.arrayContaining([
        "https://www.tradu.com/eu/additional-insolvency-event-insurance/",
      ]),
    );
    expect(result.links).not.toEqual(expect.arrayContaining(["javascript:void(0)"]));
  });

  it("collects secondary link attributes alongside tracking hrefs", () => {
    const html = `
      <html>
        <body>
          <a
            href="https://click.tradu.com/track?redirect=123"
            data-saferedirecturl="https://www.tradu.com/eu/support/"
          >
            CTA
          </a>
        </body>
      </html>
    `;

    const result = parseEmail(html);

    expect(result.links).toEqual(
      expect.arrayContaining([
        "https://click.tradu.com/track?redirect=123",
        "https://www.tradu.com/eu/support/",
      ]),
    );
  });

  it("extracts links from Braze preview payload embedded in script", () => {
    const inlineHtml = `
      <!DOCTYPE html>
      <html>
        <body>
          <a href="https://www.tradu.com/eu/support/">Support</a>
        </body>
      </html>
    `;
    const html = `
      <html>
        <head>
          <script>
            window.__INITIAL_PROPS__ = ${JSON.stringify({
              message: {
                payload: {
                  body: inlineHtml,
                  subject: "Inline subject",
                },
              },
            })};
          </script>
        </head>
        <body></body>
      </html>
    `;

    const result = parseEmail(html);

    expect(result.links).toEqual([
      "https://www.tradu.com/eu/support/",
    ]);
    expect(result.subject).toBe("Inline subject");
  });
});
