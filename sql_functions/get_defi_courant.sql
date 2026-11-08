select d.*
from public.defis_quotidiens d
where d.date_defi = public.date_defi_courante();
