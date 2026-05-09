import { shadowHandler } from './shadowProxy';

export function injectMutate() {
  console.log('ElvenAssist: Setting up MutationObserver to tamper with Elvenar scripts');

  let elvenarScriptFound: string | null = null;

  const scriptWithLoadGameCode = Array.from(document.querySelectorAll('script')).find((script) => {
    const text = script.textContent || '';
    return /function\s+loadGameCode\s*\(/.test(text);
  });

  if (scriptWithLoadGameCode) {
    const text = scriptWithLoadGameCode.textContent || '';
    const match = text.match(/function\s+loadGameCode\s*\([^)]*\)\s*\{([\s\S]*?)\}/);
    if (match) {
      const functionBody = match[1];
      console.log('Extracted function body:', functionBody);

      // Find a URL containing "elvenar-release-min" or "elvenar-release-full" in the function body
      const urlMatch = functionBody.match(/https?:\/\/[^\s'"]*elvenar-release-(min|full)[^\s'"]*/i);
      if (urlMatch) {
        const minFullVersion = urlMatch[0].includes('elvenar-release-min') ? 'min' : 'full';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).loadGameCode = async function () {
          console.log('ElvenAssist: loadGameCode called');
          await fetchAndModify(elvenarScriptFound!, minFullVersion);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).wrapOne = function (v: any, nm: string) {
          console.log('ElvenAssist: wrapOne called for', nm);
          return new Proxy(v, shadowHandler(nm));
        };

        elvenarScriptFound = urlMatch[0];
        // Replace the function body with an empty one
        const newText = text.replace(/function\s+loadGameCode\s*\([^)]*\)\s*\{([\s\S]*?)\}/, (match) =>
          match.replace(/\{([\s\S]*?)\}/, '{console.log("ElvenAssist: loadGameCode called");}'),
        );
        scriptWithLoadGameCode.textContent = newText;
      } else {
        console.warn('No elvenar-release-min URL found in function body');
      }
    } else {
      console.warn('Could not extract function body from loadGameCode');
    }
  }

  new MutationObserver((mutations, observer) => {
    // Find whether the script tag you want to tamper with exists
    // If you can't predictably identify its location,
    // you may have to iterate through the mutations' addedNodes

    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'script') {
          const script = node as HTMLScriptElement;
          const text = script.textContent || '';
          if (/function\s+loadGameCode\s*\(/.test(text)) {
            const text = script.textContent || '';
            const match = text.match(/function\s+loadGameCode\s*\([^)]*\)\s*\{([\s\S]*?)\}/);
            if (match) {
              const functionBody = match[1];
              console.log('Extracted function body:', functionBody);

              // Find a URL containing "elvenar-release-min" in the function body
              const urlMatch = functionBody.match(/https?:\/\/[^\s'"]*elvenar-release-min[^\s'"]*/i);
              if (urlMatch) {
                elvenarScriptFound = urlMatch[0];
                // fetchAndModify(elvenarScriptFound);

                // Replace the function body with an empty one
                const newText = text.replace(/function\s+loadGameCode\s*\([^)]*\)\s*\{([\s\S]*?)\}/, (match) =>
                  match.replace(/\{([\s\S]*?)\}/, '{console.log("ElvenAssist: loadGameCode called");}'),
                );
                script.textContent = newText;
              } else {
                console.warn('No elvenar-release-min URL found in function body');
              }
            } else {
              console.warn('Could not extract function body from loadGameCode');
            }
          }
          if (/elvenar-release-min-[a-f0-9]{32}\.js$/.test(script.src)) {
            const originalSrc = script.src;
            script.remove();
            // fetchAndModify(originalSrc);
          }
        }
      }
    }
  }).observe(document.body, { childList: true, characterData: true, subtree: true });
}

async function fetchAndModify(scriptSrc: string, version: 'min' | 'full') {
  try {
    const response = await fetch(scriptSrc);
    let scriptText = await response.text();
    // scriptText now contains the script as a string
    // You can now use scriptText as needed

    const idx = version === 'min' ? scriptText.indexOf('var d={},') : scriptText.indexOf('var $hxClasses = {},');
    if (idx === -1) {
      console.error("Couldn't find target code segment in tamper target");
      return;
    }
    scriptText =
      version === 'min'
        ? scriptText.replace('var d={},', 'var d={};window.aviad=d;var ')
        : scriptText.replace('var $hxClasses = {},', 'var $hxClasses = {};window.aviad=$hxClasses;var ');

    const newScript = document.createElement('script');
    newScript.type = 'text/javascript';
    newScript.textContent = scriptText;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    newScript.addEventListener('load', (window as any).onGameCodeLoaded);

    document.body.appendChild(newScript);
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
      (window as any).onGameCodeLoaded();
    }, 500);
  } catch (error) {
    console.error('Failed to fetch script:', error);
  }
}
