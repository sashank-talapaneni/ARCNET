import { resolveNodeOverlaps } from './graphUtils.js';

const node = (id, label, x, y) => ({ id, label, x, y, failed: false });
const edge = (from, to, weight, i) => ({ id: `${from}-${to}-${i}`, from, to, weight, congested: false, failed: false });

function makeEdges(items) {
  return items.map(([from, to, weight], i) => edge(from, to, weight, i));
}

export const topologies = {
  CUSTOM: {
    name: 'Adjacency Matrix',
    recommendedSource: 'A',
    recommendedDestination: 'B',
    nodes: [node('A', 'A', 340, 280), node('B', 'B', 640, 280)],
    edges: makeEdges([['A', 'B', 1]]),
  },
  CAMPUS: {
    name: 'Campus Network',
    recommendedSource: 'Gateway',
    recommendedDestination: 'MainServer',
    nodes: [
      node('Gateway', 'Gateway', 120, 160), node('AdminBlock', 'Admin', 300, 100), node('LibraryHub', 'Library', 300, 240),
      node('LabA', 'Lab A', 500, 150), node('LabB', 'Lab B', 520, 290), node('Hostel', 'Hostel', 520, 430),
      node('SportsBlock', 'Sports', 720, 420), node('MainServer', 'Server', 780, 190),
    ],
    edges: makeEdges([
      ['Gateway', 'AdminBlock', 3], ['Gateway', 'LibraryHub', 5], ['AdminBlock', 'LabA', 2], ['AdminBlock', 'LabB', 4],
      ['LibraryHub', 'LabA', 3], ['LibraryHub', 'Hostel', 6], ['LabA', 'MainServer', 4], ['LabB', 'MainServer', 2],
      ['Hostel', 'SportsBlock', 3], ['SportsBlock', 'MainServer', 8], ['LabB', 'Hostel', 5],
    ]),
  },
  DATACENTER: {
    name: 'Data Center',
    recommendedSource: 'ServerA',
    recommendedDestination: 'ServerD',
    nodes: [
      node('Spine1', 'Spine 1', 380, 90), node('Spine2', 'Spine 2', 560, 90),
      node('Leaf1', 'Leaf 1', 180, 250), node('Leaf2', 'Leaf 2', 360, 250), node('Leaf3', 'Leaf 3', 580, 250), node('Leaf4', 'Leaf 4', 760, 250),
      node('ServerA', 'Server A', 150, 420), node('ServerB', 'Server B', 330, 420), node('ServerC', 'Server C', 600, 420), node('ServerD', 'Server D', 800, 420),
    ],
    edges: makeEdges([
      ['Spine1', 'Leaf1', 1], ['Spine1', 'Leaf2', 1], ['Spine1', 'Leaf3', 1], ['Spine1', 'Leaf4', 1],
      ['Spine2', 'Leaf1', 1], ['Spine2', 'Leaf2', 1], ['Spine2', 'Leaf3', 1], ['Spine2', 'Leaf4', 1],
      ['Leaf1', 'ServerA', 2], ['Leaf2', 'ServerB', 2], ['Leaf3', 'ServerC', 2], ['Leaf4', 'ServerD', 2],
      ['ServerA', 'Leaf1', 2], ['Leaf1', 'Spine1', 1], ['Spine1', 'Leaf4', 1],
    ]),
  },
  MESH: {
    name: 'Mesh Network',
    recommendedSource: 'M1',
    recommendedDestination: 'M6',
    nodes: Array.from({ length: 7 }, (_, i) => node(`M${i + 1}`, `M${i + 1}`, 470 + Math.cos((i / 7) * Math.PI * 2) * 300, 270 + Math.sin((i / 7) * Math.PI * 2) * 190)),
    edges: makeEdges([
      ['M1', 'M2', 2], ['M2', 'M3', 4], ['M3', 'M4', 3], ['M4', 'M5', 7], ['M5', 'M6', 2], ['M6', 'M7', 5], ['M7', 'M1', 1],
      ['M1', 'M4', 9], ['M2', 'M5', 6], ['M3', 'M6', 1], ['M4', 'M7', 4], ['M2', 'M6', 8], ['M7', 'M3', 3], ['M5', 'M1', 6],
    ]),
  },
  INTERNET: {
    name: 'Internet Backbone',
    recommendedSource: 'NYC',
    recommendedDestination: 'LA',
    nodes: [
      node('NYC', 'NYC', 760, 150), node('Chicago', 'Chicago', 560, 170), node('Dallas', 'Dallas', 500, 330), node('Denver', 'Denver', 390, 260),
      node('Seattle', 'Seattle', 180, 100), node('LA', 'LA', 180, 370), node('Miami', 'Miami', 760, 430), node('Atlanta', 'Atlanta', 660, 330), node('DC', 'DC', 820, 230),
    ],
    edges: makeEdges([
      ['NYC', 'Chicago', 18], ['NYC', 'DC', 5], ['DC', 'Atlanta', 11], ['Atlanta', 'Miami', 9], ['Chicago', 'Denver', 17],
      ['Denver', 'Seattle', 25], ['Denver', 'LA', 18], ['Dallas', 'Denver', 12], ['Dallas', 'Atlanta', 13], ['LA', 'Seattle', 21],
      ['Chicago', 'Dallas', 16], ['Miami', 'Dallas', 23],
    ]),
  },
};

export function cloneTopology(id) {
  const topology = topologies[id] || topologies.CAMPUS;
  return {
    graph: {
      nodes: resolveNodeOverlaps(topology.nodes),
      edges: topology.edges.map((item) => ({ ...item })),
    },
    source: topology.recommendedSource,
    destination: topology.recommendedDestination,
  };
}
