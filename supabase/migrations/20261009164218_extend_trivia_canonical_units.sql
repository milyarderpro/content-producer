-- CR-007: extend the deliberately closed canonical unit vocabulary.  The
-- source spelling is normalized here; no arbitrary raw unit is admitted.
create or replace function internal.trivia_canonical_numbers_v2(p_numbers jsonb)
returns jsonb language plpgsql immutable strict set search_path = pg_catalog, internal as $$
declare
  v_number jsonb;
  v_value text;
  v_unit text;
  v_role text;
  v_canonical jsonb[] := array[]::jsonb[];
  v_result jsonb;
begin
  if jsonb_typeof(p_numbers) <> 'array' or jsonb_array_length(p_numbers) > 10 then
    return null;
  end if;

  for v_number in select value from jsonb_array_elements(p_numbers) loop
    if not internal.has_exact_json_keys(v_number, array['value', 'unit', 'role'])
      or jsonb_typeof(v_number -> 'value') <> 'string'
      or jsonb_typeof(v_number -> 'role') <> 'string'
      or jsonb_typeof(v_number -> 'unit') not in ('string', 'null') then
      return null;
    end if;

    v_value := v_number ->> 'value';
    v_role := btrim(v_number ->> 'role');
    v_unit := lower(btrim(v_number ->> 'unit'));
    v_unit := case v_unit
      when 'm' then 'meter' when 'meters' then 'meter' when 'metre' then 'meter' when 'metres' then 'meter'
      when 'km' then 'kilometer' when 'kilometers' then 'kilometer' when 'kilometre' then 'kilometer' when 'kilometres' then 'kilometer'
      when 'cm' then 'centimeter' when 'centimeters' then 'centimeter' when 'centimetre' then 'centimeter' when 'centimetres' then 'centimeter'
      when 'mm' then 'millimeter' when 'millimeters' then 'millimeter' when 'millimetre' then 'millimeter' when 'millimetres' then 'millimeter'
      when 'ft' then 'foot' when 'feet' then 'foot' when 'in' then 'inch' when 'inches' then 'inch' when 'mi' then 'mile' when 'miles' then 'mile'
      when 'g' then 'gram' when 'grams' then 'gram' when 'kg' then 'kilogram' when 'kilograms' then 'kilogram' when 'lb' then 'pound' when 'lbs' then 'pound' when 'pounds' then 'pound'
      when 'l' then 'liter' when 'liters' then 'liter' when 'litres' then 'liter' when 'gal' then 'gallon' when 'gallons' then 'gallon'
      when 'mph' then 'mile_per_hour' when 'km/h' then 'kilometer_per_hour'
      when 'seconds' then 'second' when 'minutes' then 'minute' when 'hours' then 'hour' when 'days' then 'day' when 'weeks' then 'week' when 'months' then 'month' when 'years' then 'year'
      when 'landings' then 'landing' when 'servings' then 'serving' when 'eggs' then 'egg' when 'rooms' then 'room' when 'passengers' then 'passenger' when 'bricks' then 'brick' when 'sounds' then 'sound'
      when '°c' then 'celsius' when 'c' then 'celsius' when '°f' then 'fahrenheit' when 'f' then 'fahrenheit'
      when '%' then 'percent' else v_unit
    end;

    if v_value !~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$'
      or char_length(v_value) > 80
      or v_role = ''
      or char_length(v_role) > 80
      or (v_unit is not null and v_unit not in (
        'count', 'meter', 'kilometer', 'centimeter', 'millimeter', 'foot', 'inch', 'mile',
        'gram', 'kilogram', 'pound', 'liter', 'gallon', 'celsius', 'fahrenheit', 'percent',
        'year', 'month', 'week', 'day', 'hour', 'minute', 'second',
        'mile_per_hour', 'kilometer_per_hour', 'landing', 'serving', 'egg', 'room',
        'passenger', 'brick', 'sound'
      )) then
      return null;
    end if;

    v_value := case when v_value::numeric = 0 then '0'
      else regexp_replace(regexp_replace(v_value, '(\.\d*?)0+$', '\\1'), '\\.$', '') end;
    v_canonical := array_append(
      v_canonical,
      jsonb_build_object('value', v_value, 'unit', to_jsonb(v_unit), 'role', v_role)
    );
  end loop;

  select coalesce(jsonb_agg(value order by value ->> 'role', coalesce(value ->> 'unit', ''), (value ->> 'value')::numeric), '[]'::jsonb)
    into v_result
    from unnest(v_canonical) as values_(value);
  return v_result;
end;
$$;

revoke all on function internal.trivia_canonical_numbers_v2(jsonb) from public, anon, authenticated, service_role;
