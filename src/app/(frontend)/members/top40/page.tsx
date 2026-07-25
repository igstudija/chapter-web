import { redirect } from 'next/navigation'

/**
 * The Top 40 list now lives on the combined "Top 40 | 20" page with a dataset
 * toggle. Keep this route as a permanent redirect so old links keep working.
 */
export default function Top40Redirect() {
  redirect('/members/top-40-20')
}
