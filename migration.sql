-- Convert materiales item arrays from text[] to jsonb storing {nombre,cantidad}
ALTER TABLE materiales
  ADD COLUMN compra_items_new jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN sede_items_new jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN san_miguel_items_new jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN compra_online_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN deposito_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN kvutza_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN alquiler_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN propios_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN otros_items jsonb DEFAULT '[]'::jsonb;

UPDATE materiales SET
  compra_items_new = (
    SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1))
    FROM unnest(compra_items) AS v
  ),
  sede_items_new = (
    SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1))
    FROM unnest(sede_items) AS v
  ),
  san_miguel_items_new = (
    SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1))
    FROM unnest(san_miguel_items) AS v
  );

ALTER TABLE materiales
  DROP COLUMN compra_items,
  DROP COLUMN sede_items,
  DROP COLUMN san_miguel_items;

ALTER TABLE materiales
  RENAME COLUMN compra_items_new TO compra_items,
  RENAME COLUMN sede_items_new TO sede_items,
  RENAME COLUMN san_miguel_items_new TO san_miguel_items;
