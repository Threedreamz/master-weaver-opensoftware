import { PipelineEngine, defaultRegistry, STLConverter, OBJConverter } from '@mw/open3d-converter';

const PORT = Number(process.env.PORT) || 4174;

// Register built-in converters
defaultRegistry.registerConverter(new STLConverter());
defaultRegistry.registerConverter(new OBJConverter());

const engine = new PipelineEngine(defaultRegistry);

console.log(`Open3D Worker running on port ${PORT}`);
console.log(`Registered converters: ${defaultRegistry.listConverters().map(c => c.name).join(', ')}`);
console.log('Waiting for jobs...');

// TODO: Connect to job queue (LRP bridge or message queue)
