package com.packetquest.factory;

import com.packetquest.model.GameSession;
import com.packetquest.model.Link;
import com.packetquest.model.Node;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds a random-but-connected network topology for a game session.
 * Produces at least 5 nodes and at least 6 links. Nodes are laid out
 * on a circle so the frontend board renders them sensibly.
 */
@Component
public class TopologyFactory {

    private static final int NODE_COUNT = 6;     // >= 5 required
    private static final int CENTER = 300;
    private static final int RADIUS = 220;
    private final SecureRandom random = new SecureRandom();

    public List<Node> buildNodes(GameSession session) {
        List<Node> nodes = new ArrayList<>();
        for (int i = 0; i < NODE_COUNT; i++) {
            double angle = (2 * Math.PI * i) / NODE_COUNT;
            Node node = new Node();
            node.setName("Node-" + (i + 1));
            node.setX(CENTER + (int) (RADIUS * Math.cos(angle)));
            node.setY(CENTER + (int) (RADIUS * Math.sin(angle)));
            node.setSession(session);
            nodes.add(node);
        }
        return nodes;
    }

    /**
     * Connect the saved nodes (which now have IDs) into a ring plus a few
     * extra chords, giving path diversity and guaranteeing >= 6 links.
     */
    public List<Link> buildLinks(GameSession session, List<Node> savedNodes) {
        List<Link> links = new ArrayList<>();
        int n = savedNodes.size();

        // Ring: each node connects to the next, last back to first (n links)
        for (int i = 0; i < n; i++) {
            Node a = savedNodes.get(i);
            Node b = savedNodes.get((i + 1) % n);
            links.add(makeLink(session, a, b));
        }

        // A couple of cross-links for alternate routes
        links.add(makeLink(session, savedNodes.get(0), savedNodes.get(n / 2)));
        links.add(makeLink(session, savedNodes.get(1), savedNodes.get(n - 2)));

        return links;
    }

    private Link makeLink(GameSession session, Node a, Node b) {
        Link link = new Link();
        link.setSource(a.getId());
        link.setTarget(b.getId());
        link.setCapacity(50 + random.nextInt(51)); // 50..100
        link.setLatency(5 + random.nextInt(46));    // 5..50 ms
        link.setLoad(0);
        link.setStatus("UP");
        link.setSession(session);
        return link;
    }
}