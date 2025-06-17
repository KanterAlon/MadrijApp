-- Convert materiales item arrays from text[] to jsonb storing {nombre,cantidad}
ALTER TABLE materiales
  ADD COLUMN compra_items_new jsonb DEFAULT '[]',
  ADD COLUMN sede_items_new jsonb DEFAULT '[]',
  ADD COLUMN san_miguel_items_new jsonb DEFAULT '[]',
  ADD COLUMN compra_online_items_new jsonb DEFAULT '[]',
  ADD COLUMN deposito_items_new jsonb DEFAULT '[]',
  ADD COLUMN kvutza_items_new jsonb DEFAULT '[]',
  ADD COLUMN alquiler_items_new jsonb DEFAULT '[]',
  ADD COLUMN propios_items_new jsonb DEFAULT '[]',
  ADD COLUMN otros_items_new jsonb DEFAULT '[]';

UPDATE materiales SET
  compra_items_new = (SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1)) FROM unnest(compra_items) AS v),
  sede_items_new = (SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1)) FROM unnest(sede_items) AS v),
  san_miguel_items_new = (SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1)) FROM unnest(san_miguel_items) AS v),
  compra_online_items_new = (SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1)) FROM unnest(compra_online_items) AS v),
  deposito_items_new = (SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1)) FROM unnest(deposito_items) AS v),
  kvutza_items_new = (SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1)) FROM unnest(kvutza_items) AS v),
  alquiler_items_new = (SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1)) FROM unnest(alquiler_items) AS v),
  propios_items_new = (SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1)) FROM unnest(propios_items) AS v),
  otros_items_new = (SELECT jsonb_agg(jsonb_build_object('nombre', v, 'cantidad', 1)) FROM unnest(otros_items) AS v);

ALTER TABLE materiales
  DROP COLUMN compra_items,
  DROP COLUMN sede_items,
  DROP COLUMN san_miguel_items,
  DROP COLUMN compra_online_items,
  DROP COLUMN deposito_items,
  DROP COLUMN kvutza_items,
  DROP COLUMN alquiler_items,
  DROP COLUMN propios_items,
  DROP COLUMN otros_items;

ALTER TABLE materiales
  RENAME COLUMN compra_items_new TO compra_items,
  RENAME COLUMN sede_items_new TO sede_items,
  RENAME COLUMN san_miguel_items_new TO san_miguel_items,
  RENAME COLUMN compra_online_items_new TO compra_online_items,
  RENAME COLUMN deposito_items_new TO deposito_items,
  RENAME COLUMN kvutza_items_new TO kvutza_items,
  RENAME COLUMN alquiler_items_new TO alquiler_items,
  RENAME COLUMN propios_items_new TO propios_items,
  RENAME COLUMN otros_items_new TO otros_items;
