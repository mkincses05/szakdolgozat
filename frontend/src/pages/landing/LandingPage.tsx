import { DISPLAY_NAME_MAX_LENGTH, DISPLAY_NAME_MIN_LENGTH, ROOM_CODE_LENGTH } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { ErrorMessage } from "../../components/ErrorMessage";
import { FormMessage } from "../../components/FormMessage";
import { HeroBanner } from "../../components/HeroBanner";
import { LanguageSelect } from "../../components/LanguageSelect";
import { Panel } from "../../components/Panel";
import { TextField } from "../../components/TextField";
import { useAccount } from "../../hooks/useAccount";
import { useAction } from "../../hooks/useAction";
import { AccountSummary } from "./components/AccountSummary";
import { JoinRoomForm } from "./components/JoinRoomForm";
import { useLandingForm } from "./hooks/useLandingForm";

export function LandingPage() {
  const { t } = useTranslation("landing");
  const { profile, logout, showWelcome } = useAccount();
  const form = useLandingForm(profile?.displayName ?? null);
  const logoutAction = useAction();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <div className="self-end">
        <LanguageSelect />
      </div>
      <HeroBanner subtitle={t("tagline")} />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="flex flex-col gap-4">
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
              <TextField
                label={t("displayName")}
                value={form.displayName}
                onChange={form.setDisplayName}
                autoComplete="nickname"
                maxLength={DISPLAY_NAME_MAX_LENGTH}
              />
              <Button variant="secondary" onClick={showWelcome}>
                {t("account.logInOrRegister")}
              </Button>
            </>
          )}
        </Panel>

        <Panel className="flex flex-col gap-4">
          <Button size="lg" className="w-full" disabled={form.pending} onClick={form.createRoom}>
            {t("createRoom")}
          </Button>
          <hr className="border-ink-dark/10" />
          <JoinRoomForm
            roomCode={form.roomCode}
            onRoomCodeChange={form.setRoomCode}
            onJoin={form.joinRoom}
            disabled={form.pending}
          />
        </Panel>
      </div>

      <div className="flex flex-col items-center gap-2">
        {form.validationError && (
          <FormMessage>
            {t(`validation.${form.validationError}`, {
              min: DISPLAY_NAME_MIN_LENGTH,
              max: DISPLAY_NAME_MAX_LENGTH,
              length: ROOM_CODE_LENGTH
            })}
          </FormMessage>
        )}
        <ErrorMessage code={form.actionError} />
      </div>
    </main>
  );
}
