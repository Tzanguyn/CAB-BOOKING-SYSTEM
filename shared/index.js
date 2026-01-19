/**
 * Shared utilities for CAB Booking System
 */

const { RabbitMQClient, EVENT_TYPES, EXCHANGES, QUEUES } = require('./utils/rabbitmq');
const { EVENT_TYPES: EventTypes, ROUTING_KEYS, EXCHANGES: ExchangeNames, QUEUES: QueueNames } = require('./constants/events');
const responseHelper = require('./utils/responseHelper');
const schemaHelpers = require('./utils/schemaHelpers');

module.exports = {
  RabbitMQClient,
  EVENT_TYPES: { ...EVENT_TYPES, ...EventTypes },
  ROUTING_KEYS,
  EXCHANGES: { ...EXCHANGES, ...ExchangeNames },
  QUEUES: { ...QUEUES, ...QueueNames },
  responseHelper,
  schemaHelpers
};