import { DISPLAY_NAME_MAX_LENGTH, DISPLAY_NAME_MIN_LENGTH, ROOM_CODE_LENGTH } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../../components/ErrorMessage";
import { LanguageSelect } from "../../components/LanguageSelect";
import { useAccount } from "../../hooks/useAccount";
import { useAction } from "../../hooks/useAction";
import { AccountSummary } from "./components/AccountSummary";
import { DisplayNameField } from "./components/DisplayNameField";
import { JoinRoomForm } from "./components/JoinRoomForm";
import { useLandingForm } from "./hooks/useLandingForm";

export function LandingPage() {
  const { t } = useTranslation("landing");
  const { profile, logout, showWelcome } = useAccount();
  const form = useLandingForm(profile?.displayName ?? null);
  const logoutAction = useAction();

  return (
    <main className="flex max-w-sm flex-col gap-4">
      <h1>{t("common:app.title")}</h1>
      <p>{t("tagline")}</p>

      <LanguageSelect />
      {profile ? (
        <>
          <AccountSummary
            profile={profile}
            onLogout={() => void logoutAction.run(logout)}
            logoutPending={logoutAction.pending}
          />
          <ErrorMessage code={logoutAction.error} />
        </>
      ) : (
        <>
          <button type="button" className="border px-2 py-1" onClick={showWelcome}>
            {t("account.logInOrRegister")}
          </button>
          <DisplayNameField value={form.displayName} onChange={form.setDisplayName} />
        </>
      )}

      <button type="button" className="border px-2 py-1" disabled={form.pending} onClick={form.createRoom}>
        {t("createRoom")}
      </button>

      <JoinRoomForm
        roomCode={form.roomCode}
        onRoomCodeChange={form.setRoomCode}
        onJoin={form.joinRoom}
        disabled={form.pending}
      />

      {form.validationError && (
        <p role="alert">
          {t(`validation.${form.validationError}`, {
            min: DISPLAY_NAME_MIN_LENGTH,
            max: DISPLAY_NAME_MAX_LENGTH,
            length: ROOM_CODE_LENGTH
          })}
        </p>
      )}
      <ErrorMessage code={form.actionError} />
    </main>
  );
}
