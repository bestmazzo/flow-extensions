import {default as Serializer, TypeResolver} from 'moddle-context-serializer';
import {Engine} from 'bpmn-engine';
import {extensions, extendFn} from '../../src/index.js';
import {FlowScripts} from './FlowScripts.js';
import {promises as fs} from 'fs';
import * as Elements from 'bpmn-elements';
import * as expressions from '@aircall/expression-parser';
import BpmnModdle from 'bpmn-moddle';
import Debug from 'debug';

let exts;

export default {
  moddleContext,
  getFlowOptions,
  getModdleExtensions,
  getOnifyFlow,
  Logger,
  recoverOnifyFlow,
  getEngine,
};

function moddleContext(source, options) {
  const bpmnModdle = new BpmnModdle(options);
  return bpmnModdle.fromXML(Buffer.isBuffer(source) ? source.toString() : source.trim());
}

async function getOnifyFlow(source, options) {
  const moddle = await moddleContext(source, await getModdleExtensions());
  if (moddle.warnings?.length) {
    const logger = Logger('bpmn-moddle');
    for (const w of moddle.warnings) logger.warn(w);
  }

  const serialized = Serializer(moddle, TypeResolver({...Elements, ...options?.types}), extendFn);
  return new Elements.Definition(new Elements.Context(serialized), {
    ...getFlowOptions(serialized.name || serialized.id),
    ...options,
  });
}

async function getEngine(name, source, options) {
  return new Engine({
    name,
    source,
    moddleOptions: await getModdleExtensions(),
    extensions: {onify: extensions},
    ...getFlowOptions(name),
    ...options,
    elements: {...Elements, ...options?.elements},
  });
}

async function recoverOnifyFlow(source, state, options) {
  const moddle = await moddleContext(source, await getModdleExtensions());
  const serialized = Serializer(moddle, TypeResolver(Elements), extendFn);
  return new Elements.Definition(new Elements.Context(serialized), {
    ...getFlowOptions(state.name || state.id),
    ...options,
  }).recover(state);
}

function getFlowOptions(name, options) {
  return {
    Logger,
    extensions: {extensions},
    services: {
      httpRequest() {},
      onifyApiRequest() {},
      onifyElevatedApiRequest() {},
      parseJSON() {},
      ...options?.services,
    },
    scripts: new FlowScripts(name, './test/resources', {
      encrypt() {},
      decrypt() {},
      jwt: {
        sign() {},
        verify() {},
      },
    }),
    expressions,
  };
}

async function getModdleExtensions() {
  if (exts) return {...exts};
  const camunda = await fs.readFile('./node_modules/camunda-bpmn-moddle/resources/camunda.json');
  exts = {
    camunda: JSON.parse(camunda),
  };

  return {...exts};
}

export function Logger(scope) {
  return {
    debug: Debug('bpmn:' + scope),
    error: Debug('bpmn:error:' + scope),
    warn: Debug('bpmn:warn:' + scope),
  };
}
