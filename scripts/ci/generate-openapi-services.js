const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const outputDir = path.join(root, 'docs', 'openapi', 'services');

const services = [
  {
    name: 'booking-service',
    appFiles: [path.join(root, 'services', 'booking-service', 'src', 'app.js')],
    routeFiles: [
      {
        file: path.join(root, 'services', 'booking-service', 'src', 'routes', 'bookingRoutes.js'),
        basePath: '/api/bookings'
      }
    ]
  },
  {
    name: 'matching-service',
    appFiles: [path.join(root, 'services', 'matching-service', 'src', 'app.js')],
    routeFiles: []
  },
  {
    name: 'pricing-service',
    appFiles: [path.join(root, 'services', 'pricing-service', 'src', 'app.js')],
    routeFiles: []
  },
  {
    name: 'eta-service',
    appFiles: [path.join(root, 'services', 'eta-service', 'src', 'app.js')],
    routeFiles: []
  },
  {
    name: 'payment-service',
    appFiles: [path.join(root, 'services', 'payment-service', 'src', 'app.js')],
    routeFiles: []
  },
  {
    name: 'driver-service',
    appFiles: [path.join(root, 'services', 'driver-service', 'src', 'app.js')],
    routeFiles: [
      {
        file: path.join(root, 'services', 'driver-service', 'src', 'routes', 'driverRoutes.js'),
        basePath: '/api/drivers'
      }
    ]
  }
];

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing route source file: ${path.relative(root, filePath)}`);
  }
}

function normalizePath(routePath) {
  if (!routePath) return '/';
  let normalized = String(routePath).trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  normalized = normalized.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function joinPath(basePath, routePath) {
  const normalizedBase = normalizePath(basePath);
  const normalizedRoute = normalizePath(routePath);
  if (normalizedRoute === '/') {
    return normalizedBase;
  }
  if (normalizedBase === '/') {
    return normalizedRoute;
  }
  return normalizePath(`${normalizedBase}/${normalizedRoute}`);
}

function parseRouteMethods(content, receiverName) {
  const quoteClass = String.raw`['"\x60]`;
  const regex = new RegExp(`${receiverName}\\.(get|post|put|patch|delete)\\(\\s*${quoteClass}([^'"\\x60]+)${quoteClass}`, 'g');
  const routes = [];
  let match = regex.exec(content);
  while (match) {
    routes.push({
      method: match[1].toLowerCase(),
      path: normalizePath(match[2])
    });
    match = regex.exec(content);
  }
  return routes;
}

function buildPathsForService(service) {
  const routeMap = new Map();

  for (const appFile of service.appFiles) {
    ensureFile(appFile);
    const content = fs.readFileSync(appFile, 'utf8');
    const appRoutes = parseRouteMethods(content, 'app');
    for (const route of appRoutes) {
      const pathKey = route.path;
      if (!routeMap.has(pathKey)) {
        routeMap.set(pathKey, {});
      }
      routeMap.get(pathKey)[route.method] = {
        tags: [service.name.replace('-service', '')],
        summary: `${route.method.toUpperCase()} ${pathKey}`,
        responses: {
          200: {
            description: 'Success'
          }
        }
      };
    }
  }

  for (const routeFile of service.routeFiles) {
    ensureFile(routeFile.file);
    const content = fs.readFileSync(routeFile.file, 'utf8');
    const routerRoutes = parseRouteMethods(content, 'router');
    for (const route of routerRoutes) {
      const fullPath = joinPath(routeFile.basePath, route.path);
      if (!routeMap.has(fullPath)) {
        routeMap.set(fullPath, {});
      }
      routeMap.get(fullPath)[route.method] = {
        tags: [service.name.replace('-service', '')],
        summary: `${route.method.toUpperCase()} ${fullPath}`,
        responses: {
          200: {
            description: 'Success'
          }
        }
      };
    }
  }

  return Object.fromEntries(Array.from(routeMap.entries()).sort((left, right) => left[0].localeCompare(right[0])));
}

function buildServiceSpec(service) {
  const paths = buildPathsForService(service);
  return {
    openapi: '3.0.3',
    info: {
      title: `${service.name} API`,
      version: '1.0.0',
      description: `Generated from ${service.name} Express route source code.`
    },
    servers: [{ url: '/' }],
    paths
  };
}

function generateOpenapiServices() {
  fs.mkdirSync(outputDir, { recursive: true });

  const generatedFiles = [];
  for (const service of services) {
    const serviceSpec = buildServiceSpec(service);
    const outputPath = path.join(outputDir, `${service.name}.generated.json`);
    fs.writeFileSync(outputPath, JSON.stringify(serviceSpec, null, 2) + '\n', 'utf8');
    generatedFiles.push(outputPath);
  }

  return generatedFiles;
}

if (require.main === module) {
  const generatedFiles = generateOpenapiServices();
  for (const filePath of generatedFiles) {
    console.log(`Generated ${path.relative(root, filePath).replace(/\\/g, '/')}`);
  }
}

module.exports = {
  services,
  outputDir,
  generateOpenapiServices
};