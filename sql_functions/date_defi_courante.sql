  select ((now() at time zone 'Europe/Paris') - interval '12 hours')::date;
