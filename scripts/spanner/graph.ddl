CREATE OR REPLACE PROPERTY GRAPH ConstellationGraph
  NODE TABLES (
    Stars
      KEY (StarId)
      LABEL Star
      PROPERTIES (StarId, Name, X, Y)
  )
  EDGE TABLES (
    Connections
      KEY (FromStarId, ToStarId)
      SOURCE KEY (FromStarId) REFERENCES Stars (StarId)
      DESTINATION KEY (ToStarId) REFERENCES Stars (StarId)
      LABEL ConnectedTo
      NO PROPERTIES
  );
