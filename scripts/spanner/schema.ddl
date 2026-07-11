CREATE TABLE Stars (
  StarId INT64 NOT NULL,
  Name STRING(MAX) NOT NULL,
  X FLOAT64 NOT NULL,
  Y FLOAT64 NOT NULL,
) PRIMARY KEY (StarId);

CREATE UNIQUE INDEX StarsByName ON Stars(Name);

CREATE TABLE Connections (
  FromStarId INT64 NOT NULL,
  ToStarId INT64 NOT NULL,
  CONSTRAINT FK_Connections_FromStar FOREIGN KEY (FromStarId) REFERENCES Stars (StarId),
  CONSTRAINT FK_Connections_ToStar FOREIGN KEY (ToStarId) REFERENCES Stars (StarId),
) PRIMARY KEY (FromStarId, ToStarId);

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
