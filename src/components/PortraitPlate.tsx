import { useProfile } from '@/lib/content';

export function PortraitPlate() {
  const profile = useProfile();

  if (profile.portrait) {
    return (
      <div className="portrait-plate portrait-plate--photo">
        <img
          className="portrait-plate__image"
          src={profile.portrait}
          alt={profile.portraitAlt}
          width={480}
          height={600}
          loading="eager"
          decoding="async"
        />
        <div className="portrait-plate__meta">
          <span>{profile.name}</span>
          <span>
            {profile.location} / {profile.timezone}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="portrait-plate">
      <span className="portrait-plate__band" aria-hidden="true" />
      <span className="portrait-plate__monogram" aria-hidden="true">
        {profile.initials}
      </span>
      <span className="portrait-plate__side" aria-hidden="true">
        Build · Test · Deploy · Repeat
      </span>
      <span className="portrait-plate__cross" aria-hidden="true">
        +
      </span>
      <div className="portrait-plate__meta">
        <span>{profile.name}</span>
        <span>
          {profile.location} / {profile.timezone}
        </span>
      </div>
      <span className="sr-only">Typographic monogram for {profile.name}</span>
    </div>
  );
}
