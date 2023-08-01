"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getExtensions = getExtensions;
var _formatters = require("./formatters.js");
var _IO = require("./IO.js");
var _Connector = _interopRequireDefault(require("./Connector.js"));
var _ExecutionListeners = _interopRequireDefault(require("./ExecutionListeners.js"));
var _IOForm = _interopRequireDefault(require("./IOForm.js"));
var _IOProperties = _interopRequireDefault(require("./IOProperties.js"));
var _ServiceExpression = _interopRequireDefault(require("./ServiceExpression.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function getExtensions(element, context) {
  const result = {};
  switch (element.type) {
    case 'bpmn:SequenceFlow':
      break;
    case 'bpmn:Process':
      result.format = new _formatters.FormatProcess(element);
      break;
    default:
      result.format = new _formatters.FormatActivity(element);
  }
  let listenerPosition = 0;
  const listeners = new _ExecutionListeners.default(element, context);
  const expression = element.behaviour.expression;
  if (expression) result.Service = _ServiceExpression.default;
  const extensions = element.behaviour.extensionElements?.values;
  if (extensions) {
    for (const ext of extensions) {
      switch (ext.$type) {
        case 'camunda:Properties':
          if (ext.values?.length) result.properties = new _IOProperties.default(element, ext);
          break;
        case 'camunda:InputOutput':
          result.io = new _IO.InputOutput(element.id, ext, context);
          break;
        case 'camunda:FormData':
          if (ext.fields?.length) result.form = new _IOForm.default(element, ext);
          break;
        case 'camunda:Connector':
          {
            const {
              connectorId,
              inputOutput
            } = ext;
            const io = inputOutput && new _IO.InputOutput(`${element.id}/${ext.$type.toLowerCase()}`, inputOutput, context);
            result.Service = _Connector.default.bind(_Connector.default, connectorId, io);
            break;
          }
        case 'camunda:ExecutionListener':
          listeners.add(ext, listenerPosition++);
          break;
      }
    }
  }
  if (listeners.length) result.listeners = listeners;
  return result;
}