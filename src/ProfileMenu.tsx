import { useState } from "react";
import { ChevronUp, LogOut, UserRound, UsersRound } from "lucide-react";

type ProfileMenuProps = {
  email: string;
  onSwitchProfile: () => void;
  onSignOut: () => void;
};

function ProfileMenu({
  email,
  onSwitchProfile,
  onSignOut,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="profile-menu">
      {open && (
        <div className="profile-popover">
          <div className="profile-popover-user">
            <UserRound size={18} />
            <span>{email}</span>
          </div>

          <button type="button" onClick={onSwitchProfile}>
            <UsersRound size={17} />
            <span>Switch profile</span>
          </button>

          <button type="button" onClick={onSignOut}>
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </div>
      )}

      <button
        type="button"
        className="profile-button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <UserRound size={20} />

        <span>
          <strong>{email}</strong>
          <small>Account</small>
        </span>

        <ChevronUp
          size={16}
          className={open ? "profile-chevron open" : "profile-chevron"}
        />
      </button>
    </div>
  );
}

export default ProfileMenu;
