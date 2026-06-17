-- Add Thai to the fixed-locale distributions returned by admin_overview_stats().
-- Keep this as a new migration; do not rewrite the already-applied 0009 RPC.

create or replace function public.admin_overview_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with bounds as (
  select
    now() - interval '7 days' as since_7d,
    now() - interval '30 days' as since_30d,
    now() - interval '48 hours' as since_48h
),
profile_counts as (
  select
    count(*) filter (where deleted_at is null) as total,
    count(*) filter (where deleted_at is null and created_at >= (select since_7d from bounds)) as new_7d,
    count(*) filter (where deleted_at is null and created_at >= (select since_30d from bounds)) as new_30d,
    count(*) filter (where deleted_at is not null) as deleted
  from profiles
),
profile_roles as (
  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', count) order by ord), '[]'::jsonb) as rows
  from (
    select roles.label, roles.ord, count(p.id) as count
    from unnest(array['member', 'premium', 'admin']) with ordinality as roles(label, ord)
    left join profiles p
      on p.role = roles.label
     and p.deleted_at is null
    group by roles.label, roles.ord
  ) s
),
profile_locales as (
  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', count) order by ord), '[]'::jsonb) as rows
  from (
    select locales.label, locales.ord, count(p.id) as count
    from unnest(array['id', 'vi', 'en', 'zh', 'th']) with ordinality as locales(label, ord)
    left join profiles p
      on p.locale = locales.label
     and p.deleted_at is null
    group by locales.label, locales.ord
  ) s
),
prediction_counts as (
  select
    count(*) as total,
    count(*) filter (where submitted_at >= (select since_7d from bounds)) as last_7d,
    count(distinct user_id) filter (where submitted_at >= (select since_7d from bounds)) as weekly_active_predictors
  from predictions
),
subscription_counts as (
  select
    count(*) as subscribers_total,
    count(*) filter (where confirmed_at is not null) as subscribers_confirmed,
    count(*) filter (where email is not null) as subscribers_email,
    count(*) filter (where whatsapp_number is not null) as subscribers_whatsapp,
    count(*) filter (where created_at >= (select since_7d from bounds)) as subscribers_new_7d
  from subscribers
),
push_counts as (
  select count(*) as push_subscriptions
  from push_subscriptions
),
article_counts as (
  select
    count(*) as total,
    count(*) filter (where status = 'published') as published,
    count(*) filter (where status = 'draft') as draft,
    count(*) filter (
      where status = 'published'
        and published_at >= (select since_48h from bounds)
    ) as published_last_48h
  from articles
),
article_types as (
  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', count) order by ord), '[]'::jsonb) as rows
  from (
    select article_types.label, article_types.ord, count(a.id) as count
    from unnest(array[
      'preview',
      'watchpoints',
      'prediction',
      'recap',
      'tactical',
      'group_analysis',
      'news'
    ]) with ordinality as article_types(label, ord)
    left join articles a
      on a.type::text = article_types.label
    group by article_types.label, article_types.ord
  ) s
),
article_locales as (
  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', count) order by ord), '[]'::jsonb) as rows
  from (
    select locales.label, locales.ord, count(a.id) as count
    from unnest(array['id', 'vi', 'en', 'zh', 'th']) with ordinality as locales(label, ord)
    left join articles a
      on a.locale = locales.label
    group by locales.label, locales.ord
  ) s
),
engagement_counts as (
  select
    (select count(*) from comments) as comments_total,
    (select count(*) from comments where created_at >= (select since_7d from bounds)) as comments_last_7d,
    (select count(*) from comment_reports) as comment_reports_total
),
campaign_counts as (
  select count(*) as entries_total
  from campaign_entries
)
select jsonb_build_object(
  'generatedAt', now(),
  'users', jsonb_build_object(
    'total', profile_counts.total,
    'new7d', profile_counts.new_7d,
    'new30d', profile_counts.new_30d,
    'deleted', profile_counts.deleted,
    'roles', profile_roles.rows,
    'locales', profile_locales.rows
  ),
  'predictions', jsonb_build_object(
    'total', prediction_counts.total,
    'last7d', prediction_counts.last_7d,
    'weeklyActivePredictors', prediction_counts.weekly_active_predictors
  ),
  'subscriptions', jsonb_build_object(
    'subscribersTotal', subscription_counts.subscribers_total,
    'subscribersConfirmed', subscription_counts.subscribers_confirmed,
    'subscribersEmail', subscription_counts.subscribers_email,
    'subscribersWhatsapp', subscription_counts.subscribers_whatsapp,
    'subscribersNew7d', subscription_counts.subscribers_new_7d,
    'pushSubscriptions', push_counts.push_subscriptions
  ),
  'content', jsonb_build_object(
    'articlesTotal', article_counts.total,
    'published', article_counts.published,
    'draft', article_counts.draft,
    'publishedLast48h', article_counts.published_last_48h,
    'types', article_types.rows,
    'locales', article_locales.rows
  ),
  'engagement', jsonb_build_object(
    'commentsTotal', engagement_counts.comments_total,
    'commentsLast7d', engagement_counts.comments_last_7d,
    'commentReportsTotal', engagement_counts.comment_reports_total
  ),
  'campaigns', jsonb_build_object(
    'entriesTotal', campaign_counts.entries_total
  )
)
from profile_counts
cross join profile_roles
cross join profile_locales
cross join prediction_counts
cross join subscription_counts
cross join push_counts
cross join article_counts
cross join article_types
cross join article_locales
cross join engagement_counts
cross join campaign_counts;
$$;

revoke execute on function public.admin_overview_stats() from public;
revoke execute on function public.admin_overview_stats() from anon;
revoke execute on function public.admin_overview_stats() from authenticated;
grant execute on function public.admin_overview_stats() to service_role;
