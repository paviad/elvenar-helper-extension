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
        window.gameVars.gameScriptUrl = urlMatch[0];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).loadGameCode = async function () {
          console.log('ElvenAssist: loadGameCode called');
          await fetchAndModify(elvenarScriptFound!, minFullVersion);
          const message = {
            type: 'gameVars',
            payload: window.gameVars,
          };
          window.postMessage(message, '*');
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

function patchCtorRegistryAssignment(scriptText: string, registryPath: string, windowField: string): string {
  const escapedRegistryPath = registryPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const registryRegex1 = new RegExp(`([\\$\\w]+)\\[['"]${escapedRegistryPath}['"]\\]\\s*=\\s*([\\w$]+)\\s*;`, 'g');
  const registryRegex2 = new RegExp(`([\\$\\w]+)\\.${escapedRegistryPath}\\s*=\\s*([\\w$]+)\\s*;`, 'g');

  const registryRegex = escapedRegistryPath === registryPath ? registryRegex2 : registryRegex1;

  const ctorProbe = registryRegex.exec(scriptText);
  let ctorFound: string | undefined = ctorProbe?.[2];

  if (!ctorFound) {
    return scriptText;
  }

  const escapedCtorFound = ctorFound.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ctorAssignmentRegex = new RegExp(`\\s${escapedCtorFound}\\s*=\\s*function\\(([^)]*)\\)`, 'g');
  console.log(`Found constructor for ${registryPath}:`, ctorFound, escapedCtorFound, ctorAssignmentRegex);
  let argumentList: string;
  const replacementResult = scriptText.replace(ctorAssignmentRegex, (_match, args) => {
    argumentList = args;
    console.log(`replacing ${_match} with ${ctorFound}2aviad=function(${args})`);
    return ` ${ctorFound}2aviad=function(${args})`;
  });
  // console.log('Ctor assignment replacement result:', replacementResult);
  scriptText = replacementResult;

  registryRegex.lastIndex = 0;
  scriptText = scriptText.replace(registryRegex, (_match, registry: string, ctor: string) => {
    const replacement = `${ctor}=function(${argumentList}){${ctor}2aviad.call(this,${argumentList});console.error('${windowField} = ${registryPath}', this);window['${windowField}']=this;window['${windowField}_a']=window['${windowField}_a']||[];window['${windowField}_a'].push(this)};\n      ${registry}['${registryPath}']=${ctor};`;
    console.log(`Applied ${registryPath} replacement:`, replacement);
    ctorFound ??= ctor;
    return replacement;
  });

  return scriptText;
}

async function fetchAndModify(scriptSrc: string, version: 'min' | 'full') {
  try {
    const response = await fetch(scriptSrc);
    let scriptText = await response.text();
    // scriptText now contains the script as a string
    // You can now use scriptText as needed

    const hookRegistry = (minText: string, fullText: string, hookName: string) => {
      const idx = version === 'min' ? scriptText.indexOf(minText) : scriptText.indexOf(fullText);
      if (idx === -1) {
        console.error(`Couldn't find target code segment in tamper target ${minText} / ${fullText} / ${hookName}`);
        throw new Error(`Couldn't find target code segment in tamper target ${minText} / ${fullText} / ${hookName}`);
      }

      const registryRex = /^(var )?([\w$]+)/;
      const registryText = registryRex.exec(version === 'min' ? minText : fullText)?.[2];

      const replacement =
        version === 'min'
          ? `${minText.slice(0, -1)};window.${hookName}=${registryText};var `
          : `${fullText.slice(0, -1)};window.${hookName}=${registryText};var `;

      scriptText =
        version === 'min' ? scriptText.replace(minText, replacement) : scriptText.replace(fullText, replacement);
    };

    // const idx = version === 'min' ? scriptText.indexOf('var d={},') : scriptText.indexOf('var $hxClasses = {},');
    // if (idx === -1) {
    //   console.error("Couldn't find target code segment in tamper target");
    //   return;
    // }
    // scriptText =
    //   version === 'min'
    //     ? scriptText.replace('var d={},', 'var d={};window.aviad=d;var ')
    //     : scriptText.replace('var $hxClasses = {},', 'var $hxClasses = {};window.aviad=$hxClasses;var ');

    hookRegistry('var d={},', 'var $hxClasses = {},', 'aviad');
    try {
      hookRegistry('Ab=Ab||{},', '$hxEnums = $hxEnums || {},', 'aviad_enum');
    } catch (e) {
      hookRegistry('vb=vb||{},', '$hxEnums = $hxEnums || {},', 'aviad_enum');
    }

    scriptText = scriptText.replace(
      /(_createCameraController\s*:\s*function\s*\(\)\s*\{)([\s\S]*?)(\}\s*,)/g,
      (match, functionStart: string, functionBody: string, functionEnd: string) => {
        const lastReturnIndex = functionBody.lastIndexOf('return');
        if (lastReturnIndex === -1) {
          return match;
        }

        const returnSlice = functionBody.slice(lastReturnIndex);
        const returnMatch = returnSlice.match(/^\s*return\s+([\s\S]*?)(;|}|$)/);
        if (!returnMatch) {
          console.log("Couldn't extract return value from _createCameraController", returnSlice);
          return match;
        }

        const returnValue = returnMatch[1].trim();

        const rc = `${functionStart}${functionBody.slice(0, lastReturnIndex)}window.aviad2=${returnValue};${returnSlice}${functionEnd}`;
        console.log('Modified _createCameraController function:', rc);
        return rc;
      },
    );

    // de.innogames.onyx.spire.views.windows.diplomacy.SpireDiplomacyWindowMediator
    scriptText = patchCtorRegistryAssignment(
      scriptText,
      'de.innogames.onyx.spire.views.windows.diplomacy.SpireDiplomacyWindowMediator',
      'aviad_wm',
    );

    // de.innogames.onyx.spire.wrappers.SpireEncounter
    scriptText = patchCtorRegistryAssignment(scriptText, 'de.innogames.onyx.spire.wrappers.SpireEncounter', 'aviad_se');

    // de.innogames.onyx.networking.services.TreasureService
    scriptText = patchCtorRegistryAssignment(
      scriptText,
      'de.innogames.onyx.networking.services.TreasureService',
      'aviad_ts',
    );

    // de.innogames.onyx.city.treasure.model.TreasureViewModel
    scriptText = patchCtorRegistryAssignment(
      scriptText,
      'de.innogames.onyx.city.treasure.model.TreasureViewModel',
      'aviad_tv',
    );

    // de.innogames.onyx.city.engine.snake.components.layers.SnakeInteractiveLayerMediator
    scriptText = patchCtorRegistryAssignment(
      scriptText,
      'de.innogames.onyx.city.engine.snake.components.layers.SnakeInteractiveLayerMediator',
      'aviad_silm',
    );

    // de.innogames.onyx.city.model.ApplicationModel
    scriptText = patchCtorRegistryAssignment(scriptText, 'de.innogames.onyx.city.model.ApplicationModel', 'aviad_am');

    // de.innogames.onyx.shared.ui.components.pagination.Pagination
    scriptText = patchCtorRegistryAssignment(
      scriptText,
      'de.innogames.onyx.shared.ui.components.pagination.Pagination',
      'aviad_pagination',
    );

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

/*
acs = aviad['de.innogames.shared.networking.AbstractConnectionService']
cms = new acs()
cms.get_serviceName = ()=>'CityMapService';
z=(x,y)=>cms.request('placeBuilding').withData(['G_Humans_FactoryStone_1',x,y]).call()
fy=async (x,y,c)=>{
  for(let i=0;i<c;i++){
    z(x,y+i);
    console.log('placed',x,y+i);
    await new Promise(r=>setTimeout(r,1000));
  }
  console.log('waiting 60 seconds');
  await new Promise(r=>setTimeout(r,60 * 1000));
}
w=async(x,y1,y2) => {
  for(let y = y1; y <= y2; y+=5){
    let countleft = y2 - y + 1;
    let actualcount = Math.min(countleft, 5);
    console.log('placing',x,y,actualcount);
    await fy(x,y,actualcount);
  }
}


// 453289


tmp = aviad['de.innogames.onyx.city.modes.BuildBuildingSectorMode']
tmp2 = tmp.prototype.placeBuilding
tmp.prototype.placeBuilding = function(e){console.log('calling placebuilding',e); return tmp2.call(this, e);}



// de_innogames_strategycity_main_controller_StartBuildEntityCommand
*/
