import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Profile, PublicContent, SkillGroup } from '@/content/types';
import { activeSocialLinks, contactMailto } from '@/content/profile';

const ContentContext = createContext<PublicContent | null>(null);

/**
 * Supplies the public content document.
 *
 * On a normal page load the document is embedded in the server-rendered HTML,
 * so the first paint already contains the real content and hydration matches.
 * The admin area fetches its own (private) copy through the admin API.
 */
export function ContentProvider({
  content,
  children,
}: {
  content: PublicContent;
  children: ReactNode;
}) {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent(): PublicContent {
  const content = useContext(ContentContext);
  if (!content) {
    throw new Error('useContent must be used inside <ContentProvider>');
  }
  return content;
}

export function useProfile(): Profile {
  return useContent().profile;
}

export function useSkillGroups(): SkillGroup[] {
  return useContent().skills.groups;
}

export function useSocialLinks() {
  return activeSocialLinks(useProfile());
}

export function useContactMailto(subject: string) {
  return contactMailto(subject, useProfile());
}
