import { CircleX, TrendingUp } from 'lucide-react';

export default function AlgoReferenceTab({ nodeCount = 8, edgeCount = 11 }) {
  const ALGO_DATA = [
    {
      id: 'dijkstra',
      name: "Dijkstra's Algorithm",
      color: 'var(--algo-dijkstra)',
      complexity: {
        time: 'O((V+E) log V)',
        space: 'O(V)',
        concrete: (v, e) => `~${Math.round((v + e) * Math.log2(v))} operations on this graph`,
      },
      type: 'Greedy — Single Source Shortest Path',
      howItWorks: 'Uses a priority queue to always process the lowest-cost unvisited node next. Guarantees the optimal path in graphs with non-negative edge weights.',
      bestFor: [
        'Sparse weighted graphs with varied edge weights',
        'Single source to single destination routing',
        'Real-world GPS and OSPF routing protocols',
        'Networks where edge weight differences are meaningful',
      ],
      worstFor: [
        'Graphs with negative edge weights',
        'Dense uniform-weight graphs (BFS is cheaper)',
        'All-pairs shortest path queries (Floyd-Warshall)',
      ],
      failureRobustness: {
        nodeCrash: 'Must fully recompute from source. Fast recovery: O((V+E) log V) per recompute.',
        costSpike: 'Re-evaluates path if spike affects current route. Finds cheaper alternative automatically.',
        overall: 'High',
      },
    },
    {
      id: 'floyd',
      name: 'Floyd-Warshall',
      color: 'var(--algo-floyd)',
      complexity: {
        time: 'O(V³)',
        space: 'O(V²)',
        concrete: (v) => `~${Math.pow(v, 3)} operations on this graph`,
      },
      type: 'Dynamic Programming — All Pairs Shortest Path',
      howItWorks: 'Builds a distance matrix by iteratively considering every node as a potential intermediate stop. Computes optimal paths between all pairs simultaneously.',
      bestFor: [
        'Dense graphs where all-pairs paths are needed',
        'Small networks where cubic cost is acceptable',
        'Detecting negative cycles in a graph',
        'When routing tables for all node pairs are required',
      ],
      worstFor: [
        'Large graphs — V³ becomes prohibitive fast',
        'Single source queries (Dijkstra is far cheaper)',
        'Dynamic networks with frequent changes',
      ],
      failureRobustness: {
        nodeCrash: 'Requires full O(V³) matrix recomputation. Most expensive recovery of all algorithms.',
        costSpike: 'Full matrix recompute required — cannot partially update.',
        overall: 'Low — very expensive to adapt',
      },
    },
    {
      id: 'bfs',
      name: 'Breadth-First Search',
      color: 'var(--algo-bfs)',
      complexity: {
        time: 'O(V+E)',
        space: 'O(V)',
        concrete: (v, e) => `~${v + e} operations on this graph`,
      },
      type: 'Graph Traversal — Minimum Hop Count',
      howItWorks: 'Explores all neighbors at the current hop level before going deeper. Guarantees the path with fewest hops but completely ignores edge weights.',
      bestFor: [
        'Unweighted graphs where all edges are equal',
        'Finding minimum number of hops',
        'Network reachability analysis',
        'When hop count matters more than total cost',
      ],
      worstFor: [
        'Weighted graphs — ignores costs entirely',
        'Finding minimum cost path when weights vary',
        'Any scenario where edge weights are meaningful',
      ],
      failureRobustness: {
        nodeCrash: 'Must recompute but very fast: O(V+E). Finds minimum-hop alternate quickly.',
        costSpike: 'Completely unaffected — BFS ignores edge weights entirely.',
        overall: 'High for topology changes, immune to cost changes',
      },
    },
    {
      id: 'dfs',
      name: 'Depth-First Search',
      color: 'var(--algo-dfs)',
      complexity: {
        time: 'O(V+E)',
        space: 'O(V)',
        concrete: (v, e) => `~${v + e} operations on this graph`,
      },
      type: 'Graph Traversal — Path Exploration',
      howItWorks: 'Explores as far as possible down each branch before backtracking. Finds a path but not necessarily the shortest or cheapest. Useful for connectivity and reachability.',
      bestFor: [
        'Verifying network connectivity',
        'Enumerating all possible paths',
        'Detecting cycles in a network',
        'Scenarios where any valid path is acceptable',
      ],
      worstFor: [
        'Finding optimal paths — no guarantee of shortest',
        'Weighted graphs where cost matters',
        'Large deep graphs — stack depth can be problematic',
      ],
      failureRobustness: {
        nodeCrash: 'Recomputes quickly O(V+E) but may find a suboptimal alternate path.',
        costSpike: 'Generally unaffected unless spike causes path to become structurally invalid.',
        overall: 'Medium — fast recovery but path quality not guaranteed',
      },
    },
    {
      id: 'backtrack',
      name: 'Backtracking',
      color: 'var(--algo-backtrack)',
      complexity: {
        time: 'O(b^d) where b=branching factor, d=depth',
        space: 'O(d)',
        concrete: () => 'Variable — depends on threshold and topology',
      },
      type: 'Constraint Satisfaction — Quality-Aware Routing',
      howItWorks: 'Explores paths but rejects any edge whose weight exceeds the configured threshold. Backtracks when it hits a dead end or constraint violation. Prioritizes path validity over optimality.',
      bestFor: [
        'Networks with strict quality-of-service requirements',
        'Routing where individual link quality matters',
        'Finding paths that avoid heavily congested links',
        'QoS routing in real networks',
      ],
      worstFor: [
        'Low thresholds on dense graphs — excessive backtracking',
        'Optimizing total path cost',
        'When threshold eliminates most paths',
      ],
      failureRobustness: {
        nodeCrash: 'Recomputes with constraint intact. May fail if no constraint-satisfying path exists.',
        costSpike: 'If spiked edge exceeds threshold: immediately rejects and reroutes. Unique behavior.',
        overall: 'Unique — provides constraint-based resilience unavailable in other algorithms',
      },
    },
  ];

  const ratingClass = (overall) => {
    if (overall.startsWith('High')) return 'high';
    if (overall.startsWith('Low')) return 'low';
    if (overall.startsWith('Medium')) return 'medium';
    return 'unique';
  };

  return (
    <div className="algo-reference-tab">
      {ALGO_DATA.map((algorithm) => (
        <article key={algorithm.id} className="algo-reference-card" style={{ '--algo-color': algorithm.color }}>
          <header className="algo-reference-header">
            <span className="algo-reference-dot" />
            <h3>{algorithm.name}</h3>
            <em>{algorithm.type}</em>
          </header>

          <div className="algo-complexity">
            <span><b>Time</b><strong>{algorithm.complexity.time}</strong></span>
            <span><b>Space</b>{algorithm.complexity.space}</span>
            <i>{algorithm.complexity.concrete(nodeCount, edgeCount)}</i>
          </div>

          <p className="algo-how-it-works">{algorithm.howItWorks}</p>

          <div className="algo-use-cases">
            <section className="algo-best-for">
              <h4>✓ BEST FOR</h4>
              <ul>
                {algorithm.bestFor.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <section className="algo-worst-for">
              <h4>✕ AVOID WHEN</h4>
              <ul>
                {algorithm.worstFor.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          </div>

          <section className="algo-robustness">
            <h4>NETWORK FAILURE ROBUSTNESS</h4>
            <div><CircleX size={13} /><b>Node crash</b><span>{algorithm.failureRobustness.nodeCrash}</span></div>
            <div><TrendingUp size={13} /><b>Cost spike</b><span>{algorithm.failureRobustness.costSpike}</span></div>
            <strong className={`robustness-rating ${ratingClass(algorithm.failureRobustness.overall)}`}>
              {algorithm.failureRobustness.overall}
            </strong>
          </section>
        </article>
      ))}
    </div>
  );
}
