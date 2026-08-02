-- 030: bucket público para fotos de perfil de profesionales.
--
-- No existía ningún bucket público apto para esto: professional-documents
-- es privado (URLs firmadas, correcto para cédulas/certificados, pero
-- inadecuado para una foto que se muestra en cada tarjeta de la vitrina
-- pública sin generar una URL firmada por card). residence-images es
-- público pero es de otro dominio (residencias, no profesionales).
-- Mismo patrón de policies que residence-images (migración 025): lectura
-- pública, escritura solo del dueño del perfil, admin con acceso total.
insert into storage.buckets (id, name, public)
values ('professional-avatars', 'professional-avatars', true)
on conflict (id) do nothing;

create policy "professional_avatars_storage_select_public"
  on storage.objects for select
  using (bucket_id = 'professional-avatars');

create policy "professional_avatars_storage_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'professional-avatars'
    and (storage.foldername(name))[1] in (
      select professional_profiles.id::text
      from professional_profiles
      where professional_profiles.user_id = auth_user_id()
    )
  );

create policy "professional_avatars_storage_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'professional-avatars'
    and (storage.foldername(name))[1] in (
      select professional_profiles.id::text
      from professional_profiles
      where professional_profiles.user_id = auth_user_id()
    )
  );

create policy "professional_avatars_storage_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'professional-avatars'
    and (storage.foldername(name))[1] in (
      select professional_profiles.id::text
      from professional_profiles
      where professional_profiles.user_id = auth_user_id()
    )
  );

create policy "professional_avatars_storage_admin"
  on storage.objects for all
  using (bucket_id = 'professional-avatars' and auth_user_role() = 'admin')
  with check (bucket_id = 'professional-avatars' and auth_user_role() = 'admin');
